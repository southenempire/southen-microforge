import { NextResponse } from 'next/server';
import { generateMicroTool } from '@/lib/generator';
import { executeInSandbox } from '@/lib/createos';
import { provisionStripeRails } from '@/lib/stripe';
import { store } from '@/lib/store';
import { persistTool } from '@/lib/supabase';
import { MicroTool, AgentStep } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const { prompt, priceCents = 10 } = await req.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Valid prompt is required' }, { status: 400 });
    }

    const steps: AgentStep[] = [];
    const addStep = (id: string, label: string, status: AgentStep['status'], detail?: string) => {
      steps.push({ id, label, status, detail, timestamp: new Date().toISOString() });
    };

    // Step 1: Spec Synthesis
    addStep('spec', 'Synthesizing API contract & input schema', 'running', 'Analyzing natural language requirements...');
    const spec = await generateMicroTool(prompt);
    steps[steps.length - 1].status = 'completed';
    steps[steps.length - 1].detail = `Generated: ${spec.name} (${spec.slug})`;

    // Step 2: Sandbox Boot & Test Execution (CreateOS Firecracker Micro-VM)
    addStep('sandbox', 'Booting CreateOS Firecracker Micro-VM (devbox:1)', 'running', 'Creating micro-VM sandbox with eBPF isolation...');
    let sandboxResult = await executeInSandbox(spec.code, spec.testSuite);
    
    // Step 3: Self-Healing Loop if needed
    if (!sandboxResult.success) {
      addStep('healing', 'Self-Healing Loop: Patching code based on stderr trace', 'running', `Detected test failure: ${sandboxResult.stderr.slice(0, 100)}...`);
      const fixedSpec = await generateMicroTool(prompt, sandboxResult.stderr);
      spec.code = fixedSpec.code;
      spec.testSuite = fixedSpec.testSuite;
      
      sandboxResult = await executeInSandbox(spec.code, spec.testSuite);
      steps[steps.length - 1].status = sandboxResult.success ? 'completed' : 'failed';
      steps[steps.length - 1].detail = sandboxResult.success ? 'Patched and verified green in Micro-VM!' : 'Self-healing reached iteration limit';
    } else {
      steps[steps.length - 1].status = 'completed';
      steps[steps.length - 1].detail = `Passed in ${sandboxResult.durationMs}ms in Firecracker Micro-VM (${sandboxResult.sandboxId || 'microvm-active'})`;
    }

    // Guard: Enforce Deterministic Evaluation - Never publish tools that fail verification tests
    if (!sandboxResult.success) {
      addStep('deploy', 'Tool deployment rejected: Failed micro-VM verification', 'failed', 'Prevented unverified code from entering public catalog');
      return NextResponse.json({
        success: false,
        error: `Tool failed micro-VM verification: ${sandboxResult.stderr.slice(0, 200) || 'Assertions failed'}`,
        steps,
        sandboxResult
      }, { status: 422 });
    }

    // Step 4: Stripe Billing Rails Provisioning
    addStep('stripe', 'Provisioning Stripe billing rails & payment links', 'running', 'Connecting to Stripe Projects sandbox...');
    const stripeRails = await provisionStripeRails(spec.name, spec.slug, priceCents);
    steps[steps.length - 1].status = 'completed';
    steps[steps.length - 1].detail = `Price: $${(priceCents / 100).toFixed(2)}/run · Payment link ready`;

    // Step 5: Save tool to catalog
    const toolId = `tool_${spec.slug}_${Math.random().toString(36).substring(2, 6)}`;
    const newTool: MicroTool = {
      id: toolId,
      name: spec.name,
      slug: spec.slug,
      description: spec.description,
      category: spec.category,
      priceCents,
      currency: 'USD',
      systemPrompt: prompt,
      generatedCode: spec.code,
      testSuite: spec.testSuite,
      status: 'active',
      stripeProductId: stripeRails.productId,
      stripePriceId: stripeRails.priceId,
      stripePaymentUrl: stripeRails.paymentUrl,
      sandboxId: sandboxResult.sandboxId,
      totalRuns: 0,
      revenueEarnedCents: 0,
      createdAt: new Date().toISOString(),
      sampleInput: spec.sampleInput,
    };

    store.addTool(newTool);
    await persistTool(newTool);

    addStep('deploy', 'Deploying verified zero-devops live endpoint', 'completed', `Live at /api/tools/${spec.slug}`);

    return NextResponse.json({
      success: true,
      tool: newTool,
      steps,
      sandboxResult,
    });
  } catch (err: any) {
    console.error('Error in agent forge:', err);
    return NextResponse.json({ error: err?.message || 'Agent pipeline encountered an error' }, { status: 500 });
  }
}
