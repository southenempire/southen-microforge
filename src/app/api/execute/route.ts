import { NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { reserveExecutionHold, captureExecutionHold, releaseExecutionHold } from '@/lib/stripe';
import vm from 'vm';

export async function POST(req: Request) {
  try {
    const { toolId, inputPayload } = await req.json();

    const tool = store.getTool(toolId);
    if (!tool) {
      return NextResponse.json({ error: 'Micro-tool not found' }, { status: 404 });
    }

    const executionId = `exec_${Math.random().toString(36).substring(2, 9)}`;

    // =========================================================================
    // PHASE 1: RESERVE (Stripe Authorization Hold & Ledger Entry)
    // =========================================================================
    const reservation = await reserveExecutionHold({
      toolId: tool.id,
      toolName: tool.name,
      priceCents: tool.priceCents,
    });

    store.addLedgerEntry({
      id: `ledg_${Math.random().toString(36).substring(2, 8)}`,
      executionId,
      toolId: tool.id,
      toolName: tool.name,
      entryType: 'HOLD_RESERVED',
      amountCents: tool.priceCents,
      currency: tool.currency,
      timestamp: reservation.timestamp,
      details: `Stripe Pre-Auth Hold reserved (${reservation.holdId})`,
    });

    const startTime = Date.now();
    let executionOutput: any = null;
    let executionError: string | null = null;

    // =========================================================================
    // PHASE 2: EXECUTE IN SANDBOX (CreateOS Micro-VM isolation)
    // =========================================================================
    try {
      const sandboxModule = { exports: {} as any };
      const sandboxContext = {
        module: sandboxModule,
        exports: sandboxModule.exports,
        Buffer,
        Date,
        console: { log: () => {}, error: () => {}, warn: () => {} },
      };

      vm.createContext(sandboxContext);
      vm.runInContext(tool.generatedCode, sandboxContext, { timeout: 4000 });

      if (typeof sandboxModule.exports.run !== 'function') {
        throw new Error('Micro-tool does not export a valid run(input) function');
      }

      executionOutput = sandboxModule.exports.run(inputPayload);
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

      store.addExecution({
        id: executionId,
        toolId: tool.id,
        toolName: tool.name,
        state: 'captured',
        inputPayload,
        outputPayload: executionOutput,
        durationMs,
        stripePaymentIntentId: captureResult.captureId,
        reservedAmountCents: tool.priceCents,
        capturedAmountCents: tool.priceCents,
        createdAt: new Date().toISOString(),
      });

      store.addLedgerEntry({
        id: `ledg_${Math.random().toString(36).substring(2, 8)}`,
        executionId,
        toolId: tool.id,
        toolName: tool.name,
        entryType: 'PAYMENT_CAPTURED',
        amountCents: tool.priceCents,
        currency: tool.currency,
        timestamp: captureResult.timestamp,
        details: `Two-Phase Success: Captured $${(tool.priceCents / 100).toFixed(2)} (${captureResult.captureId})`,
      });

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

      store.addExecution({
        id: executionId,
        toolId: tool.id,
        toolName: tool.name,
        state: 'released',
        inputPayload,
        errorMessage: executionError || 'Sandbox run failed',
        durationMs,
        reservedAmountCents: tool.priceCents,
        capturedAmountCents: 0,
        createdAt: new Date().toISOString(),
      });

      store.addLedgerEntry({
        id: `ledg_${Math.random().toString(36).substring(2, 8)}`,
        executionId,
        toolId: tool.id,
        toolName: tool.name,
        entryType: 'HOLD_RELEASED',
        amountCents: 0,
        currency: tool.currency,
        timestamp: releaseResult.timestamp,
        details: `Two-Phase Fail-Safe: Hold voided. Customer charged $0.00 (${executionError})`,
      });

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
