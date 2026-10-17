import { executeInSandbox } from '../src/lib/createos';
import { reserveExecutionHold, captureExecutionHold, releaseExecutionHold } from '../src/lib/stripe';
import { generateMicroTool } from '../src/lib/generator';
import { persistExecution, persistLedgerEntry, getPersistedLedger } from '../src/lib/supabase';
import { store } from '../src/lib/store';

async function runTestSuite() {
  console.log('================================================================');
  console.log('🚀 MICROFORGE COMPREHENSIVE END-TO-END VERIFICATION TEST SUITE');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assertTest(name: string, condition: boolean, details?: any) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${name}`);
      if (details) console.log('   Details:', details);
    } else {
      console.error(`❌ [FAIL] ${name}`);
      if (details) console.error('   Details:', details);
    }
  }

  // --------------------------------------------------------------------------
  // TEST SECTION 1: CREATEOS FIRECRACKER MICRO-VM EXECUTION
  // --------------------------------------------------------------------------
  console.log('--- SECTION 1: CREATEOS FIRECRACKER MICRO-VM EXECUTION ---');
  try {
    const testCode = `
      function run(input) {
        if (!input || !input.str) throw new Error('Missing input.str');
        return {
          reversed: input.str.split('').reverse().join(''),
          length: input.str.length,
          timestamp: new Date().toISOString()
        };
      }
      module.exports = { run };
    `;

    const testRunner = `
      const inputData = { str: 'CreateOS + MicroForge' };
      const res = module.exports.run(inputData);
      console.log('RESULT_OUTPUT:' + JSON.stringify(res));
    `;

    console.log('Pushing and executing in CreateOS Firecracker micro-VM...');
    const vmResult = await executeInSandbox(testCode, testRunner);
    
    assertTest('CreateOS VM returned success=true', vmResult.success === true, {
      durationMs: vmResult.durationMs,
      sandboxId: vmResult.sandboxId,
      isMicroVm: vmResult.isMicroVm
    });

    assertTest('CreateOS VM output contains valid RESULT_OUTPUT', vmResult.stdout.includes('RESULT_OUTPUT:'), {
      stdout: vmResult.stdout.trim()
    });

    const parsedRes = JSON.parse(vmResult.stdout.split('RESULT_OUTPUT:')[1].trim());
    assertTest('CreateOS VM correctly executed business logic in guest VM', parsedRes.reversed === 'egroForciM + SOetaerC', parsedRes);

    // Test VM error handling and isolation
    const failRunner = `
      const res = module.exports.run({}); // will throw 'Missing input.str'
    `;
    const failResult = await executeInSandbox(testCode, failRunner);
    assertTest('CreateOS VM cleanly traps errors with success=false', failResult.success === false, {
      stderr: failResult.stderr.trim().split('\n')[0]
    });

  } catch (err: any) {
    assertTest('Section 1 Exception', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SECTION 2: STRIPE TWO-PHASE MANUAL PRE-AUTH HOLD & CAPTURE
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 2: STRIPE REAL TWO-PHASE PRE-AUTH HOLD & CAPTURE ---');
  try {
    // 2A: Hold -> Capture Lifecycle (Success Path)
    console.log('Reserving Stripe manual hold for $0.25 (25 cents)...');
    const holdA = await reserveExecutionHold({
      toolId: 'tool_test_verify',
      toolName: 'Verification Suite Tool',
      priceCents: 25
    });

    assertTest('Stripe created valid holdId starting with pi_', holdA.holdId.startsWith('pi_'), {
      holdId: holdA.holdId,
      amountCents: holdA.amountCents,
      status: holdA.status
    });

    console.log(`Capturing Stripe hold ${holdA.holdId}...`);
    const captureA = await captureExecutionHold(holdA.holdId, 25);
    assertTest('Stripe hold captured with status=captured', captureA.status === 'captured' || captureA.status === 'succeeded', {
      captureId: captureA.captureId,
      status: captureA.status
    });

    // 2B: Hold -> Cancel/Void Lifecycle (Failure / Abort Path)
    console.log('Reserving Stripe manual hold for abort test ($0.15)...');
    const holdB = await reserveExecutionHold({
      toolId: 'tool_test_fail',
      toolName: 'Failed Tool Void Test',
      priceCents: 15
    });

    console.log(`Releasing/voiding Stripe hold ${holdB.holdId}...`);
    const releaseB = await releaseExecutionHold(holdB.holdId);
    assertTest('Stripe hold released with status=released', releaseB.status === 'released' || releaseB.status === 'canceled', {
      holdId: releaseB.holdId,
      status: releaseB.status
    });

  } catch (err: any) {
    assertTest('Section 2 Exception', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SECTION 3: PROMPT SYNTHESIS ENGINE
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 3: PROMPT SYNTHESIS ENGINE ACCURACY ---');
  try {
    const prompts = [
      {
        prompt: 'Reverse a string: return input.text split reversed joined',
        expectedSlug: 'string-reverser',
        testInput: { text: 'Hello World' },
        expectedKey: 'reversedText',
        expectedValue: 'dlroW olleH'
      },
      {
        prompt: 'URL slugifier: convert input.title into a lowercase slug with dashes',
        expectedSlug: 'url-slugifier',
        testInput: { title: 'CreateOS Is Awesome!' },
        expectedKey: 'slug',
        expectedValue: 'createos-is-awesome'
      },
      {
        prompt: 'Base64 encoder and decoder: return both representations for input.raw',
        expectedSlug: 'base64-codec',
        testInput: { raw: 'MicroForge2026' },
        expectedKey: 'encoded',
        expectedValue: Buffer.from('MicroForge2026').toString('base64')
      }
    ];

    for (const testCase of prompts) {
      console.log(`Synthesizing prompt: "${testCase.prompt}"...`);
      const tool = await generateMicroTool(testCase.prompt);
      
      assertTest(`Synthesizer chose expected slug for prompt (${tool.slug})`, tool.slug === testCase.expectedSlug, {
        name: tool.name,
        slug: tool.slug
      });

      // Execute synthesized unit tests in CreateOS Firecracker VM
      const vmTest = await executeInSandbox(tool.code, tool.testSuite);
      assertTest(`Synthesized tool "${tool.name}" passes unit tests in CreateOS VM`, vmTest.success === true, {
        durationMs: vmTest.durationMs
      });
    }

  } catch (err: any) {
    assertTest('Section 3 Exception', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TEST SECTION 4: APPEND-ONLY LEDGER & SUPABASE PERSISTENCE
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 4: APPEND-ONLY LEDGER & PERSISTENCE ---');
  try {
    const testExecId = `exec_test_${Date.now()}`;
    const ledgerEntry = {
      id: `ledg_test_${Date.now()}`,
      executionId: testExecId,
      toolId: 'tool_markdown_sanitizer',
      toolName: 'Markdown & Rich Text Sanitizer',
      entryType: 'PAYMENT_CAPTURED' as const,
      amountCents: 5,
      currency: 'USD',
      timestamp: new Date().toISOString(),
      details: 'Automated verification test suite entry'
    };

    console.log('Writing test entry to ledger and Supabase...');
    await persistLedgerEntry(ledgerEntry);

    const ledger = await getPersistedLedger(store.getLedger());
    const found = ledger.some(l => l.id === ledgerEntry.id || l.executionId === testExecId);
    assertTest('Ledger entry persisted and retrievable via getPersistedLedger', found === true, {
      totalEntries: ledger.length,
      sampleEntry: ledger[0]?.id
    });

  } catch (err: any) {
    assertTest('Section 4 Exception', false, err.message);
  }

  // --------------------------------------------------------------------------
  // FINAL SCORE SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`🏁 TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================');

  if (passedTests === totalTests) {
    console.log('🎉 ALL SYSTEMS FULLY OPERATIONAL AND VERIFIED LIVE!');
    process.exit(0);
  } else {
    console.error('⚠️ SOME TESTS FAILED. Inspect details above.');
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test suite crash:', err);
  process.exit(1);
});
