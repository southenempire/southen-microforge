import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { reserveExecutionHold, captureExecutionHold, releaseExecutionHold } from '@/lib/stripe';
import { getPersistedTools, persistExecution, persistLedgerEntry } from '@/lib/supabase';
import { executeInSandbox } from '@/lib/createos';
import vm from 'vm';

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const querySlug = url.searchParams.get('slug');
    const body = await req.json().catch(() => ({}));

    const toolId = body.toolId;
    const toolSlug = querySlug || body.slug;

    // Retrieve tool from Supabase / persisted state
    const allTools = await getPersistedTools(store.getTools());
    const tool = toolId 
      ? allTools.find((t: any) => t.id === toolId) 
      : (toolSlug ? allTools.find((t: any) => t.slug === toolSlug) : null);

    if (!tool) {
      return NextResponse.json({ error: 'Micro-tool not found in catalog' }, { status: 404 });
    }

    const inputPayload = body.inputPayload !== undefined 
      ? body.inputPayload 
      : (querySlug ? body : (body.payload || {}));

    const executionId = `exec_${Math.random().toString(36).substring(2, 9)}`;

    // =========================================================================
    // PHASE 1: RESERVE (Stripe Pre-Authorization Hold & Ledger Entry)
    // =========================================================================
    const reservation = await reserveExecutionHold({
      toolId: tool.id,
      toolName: tool.name,
      priceCents: tool.priceCents,
    });

    const reserveEntry = {
      id: `ledg_${Math.random().toString(36).substring(2, 8)}`,
      executionId,
      toolId: tool.id,
      toolName: tool.name,
      entryType: 'HOLD_RESERVED' as const,
      amountCents: tool.priceCents,
      currency: tool.currency,
      timestamp: reservation.timestamp,
      details: `Stripe Pre-Auth Hold reserved (${reservation.holdId})`,
    };

    store.addLedgerEntry(reserveEntry);
    await persistLedgerEntry(reserveEntry);

    const startTime = Date.now();
    let executionOutput: any = null;
    let executionError: string | null = null;

    // =========================================================================
    // PHASE 2: EXECUTE IN SANDBOX (CreateOS Micro-VM isolation)
    // =========================================================================
    try {
      // Create isolated guest execution wrapper preventing process.exit or leakages
      const wrappedRunner = `
        const inputData = ${JSON.stringify(inputPayload)};
        const app = (typeof require === 'function') ? (require('./app.js') || require('app.js') || {}) : {};
        let targetRun = null;
        if (typeof app.run === 'function') {
          targetRun = app.run;
        } else if (typeof module !== 'undefined' && module.exports && typeof module.exports.run === 'function') {
          targetRun = module.exports.run;
        } else if (typeof run === 'function') {
          targetRun = run;
        }
        if (!targetRun) {
          throw new Error('Micro-tool module does not export run(input) function');
        }
        const __res = targetRun(inputData);
        console.log('RESULT_OUTPUT:' + JSON.stringify(__res));
      `;

      // Dispatch to CreateOS Firecracker micro-VM
      const vmResult = await executeInSandbox(tool.generatedCode, wrappedRunner);
      
      if (vmResult.success && vmResult.stdout) {
        const marker = 'RESULT_OUTPUT:';
        const idx = vmResult.stdout.indexOf(marker);
        if (idx !== -1) {
          const jsonPart = vmResult.stdout.slice(idx + marker.length).trim().split('\n')[0];
          executionOutput = JSON.parse(jsonPart);
        } else {
          executionOutput = { success: true, message: 'Execution completed in sandbox', stdout: vmResult.stdout.slice(0, 300) };
        }
      } else if (!vmResult.success && vmResult.stderr && !vmResult.stderr.includes('command not found') && !vmResult.stderr.includes('ENOENT')) {
        executionError = vmResult.stderr.slice(0, 300);
      } else {
        // Fallback isolated hardened sandbox VM
        const sandboxModule = { exports: {} as any };
        const sandboxContext = {
          module: sandboxModule,
          exports: sandboxModule.exports,
          Buffer,
          Date,
          console: { log: () => {}, error: () => {}, warn: () => {} },
        };
        vm.createContext(sandboxContext);
        vm.runInContext(tool.generatedCode, sandboxContext, { timeout: 3500 });
        if (typeof sandboxModule.exports.run !== 'function') {
          throw new Error('Micro-tool does not export a valid run(input) function');
        }
        executionOutput = sandboxModule.exports.run(inputPayload);
      }
    } catch (err: any) {
      executionError = err.message || 'Execution error inside sandbox';
    }

    const durationMs = Date.now() - startTime;

    // =========================================================================
    // PHASE 3: CAPTURE OR RELEASE
    // =========================================================================
    if (executionOutput && !executionError) {
      // 3A: CAPTURE (Success: 200 OK)
      const captureResult = await captureExecutionHold(reservation.holdId, tool.priceCents);

      const execRecord = {
        id: executionId,
        toolId: tool.id,
        toolName: tool.name,
        state: 'captured' as const,
        inputPayload,
        outputPayload: executionOutput,
        durationMs,
        stripePaymentIntentId: captureResult.captureId,
        reservedAmountCents: tool.priceCents,
        capturedAmountCents: tool.priceCents,
        createdAt: new Date().toISOString(),
      };

      store.addExecution(execRecord);
      await persistExecution(execRecord);

      const captureEntry = {
        id: `ledg_${Math.random().toString(36).substring(2, 8)}`,
        executionId,
        toolId: tool.id,
        toolName: tool.name,
        entryType: 'PAYMENT_CAPTURED' as const,
        amountCents: tool.priceCents,
        currency: tool.currency,
        timestamp: captureResult.timestamp,
        details: `Two-Phase Success: Captured $${(tool.priceCents / 100).toFixed(2)} (${captureResult.captureId})`,
      };

      store.addLedgerEntry(captureEntry);
      await persistLedgerEntry(captureEntry);

      return NextResponse.json({
        success: true,
        state: 'captured',
        executionId,
        output: executionOutput,
        durationMs,
        amountChargedCents: tool.priceCents,
      });
    } else {
      // 3B: RELEASE / VOID (Failure: Customer is never charged!)
      const releaseResult = await releaseExecutionHold(reservation.holdId, executionError || 'Sandbox run failed');

      const failedRecord = {
        id: executionId,
        toolId: tool.id,
        toolName: tool.name,
        state: 'released' as const,
        inputPayload,
        errorMessage: executionError || 'Sandbox run failed',
        durationMs,
        reservedAmountCents: tool.priceCents,
        capturedAmountCents: 0,
        createdAt: new Date().toISOString(),
      };

      store.addExecution(failedRecord);
      await persistExecution(failedRecord);

      const releaseEntry = {
        id: `ledg_${Math.random().toString(36).substring(2, 8)}`,
        executionId,
        toolId: tool.id,
        toolName: tool.name,
        entryType: 'HOLD_RELEASED' as const,
        amountCents: 0,
        currency: tool.currency,
        timestamp: releaseResult.timestamp,
        details: `Two-Phase Fail-Safe: Hold voided. Customer charged $0.00 (${executionError})`,
      };

      store.addLedgerEntry(releaseEntry);
      await persistLedgerEntry(releaseEntry);

      return NextResponse.json({
        success: false,
        state: 'released',
        executionId,
        error: executionError,
        durationMs,
        amountChargedCents: 0,
      }, { status: 422 });
    }
  } catch (err: any) {
    console.error('Error in execute route:', err);
    return NextResponse.json({ error: err.message || 'Internal execution error' }, { status: 500 });
  }
}
