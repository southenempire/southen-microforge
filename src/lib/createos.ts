import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

// Helper that executes CreateOS CLI using the valid API key or stored session
function runCreateOs(cmd: string, timeout = 15000): Promise<{ stdout: string; stderr: string }> {
  const env = { ...process.env };
  if (process.env.CREATEOS_API_KEY && process.env.CREATEOS_API_KEY.startsWith('skp_')) {
    env.CREATEOS_API_KEY = process.env.CREATEOS_API_KEY;
  } else {
    delete env.CREATEOS_API_KEY;
  }
  return execAsync(cmd, { env, timeout });
}

export interface SandboxExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
  durationMs: number;
  isMicroVm: boolean;
  sandboxId?: string;
}

// Active sandbox ID cache (Active Firecracker micro-VM)
let activeSandboxId = 'sb-01m561fxede82rstkd4192t7m7';

async function getOrCreateActiveSandbox(): Promise<string> {
  // Check if current sandbox is running or in account
  try {
    const { stdout } = await runCreateOs('createos sandbox list --quiet');
    if (activeSandboxId && stdout.includes(activeSandboxId)) {
      return activeSandboxId;
    }
    // Discover any existing sandbox in user account
    const lines = stdout.trim().split('\n').map(l => l.trim()).filter(l => l.startsWith('sb-'));
    if (lines.length > 0) {
      activeSandboxId = lines[0].split(/\s+/)[0];
      return activeSandboxId;
    }
  } catch (e) {
    // ignore
  }

  // Create a fresh CreateOS Firecracker micro-VM
  try {
    const { stdout } = await runCreateOs('createos sandbox create --shape s-1vcpu-1gb --rootfs devbox:1 --auto-pause 10m');
    const match = stdout.match(/\((sb-[a-z0-9]+)\)/);
    if (match && match[1]) {
      activeSandboxId = match[1];
      return activeSandboxId;
    }
  } catch (err) {
    console.warn('[CreateOS Sandbox] Error creating sandbox via CLI:', err);
  }

  return activeSandboxId || 'sb-01m561fxede82rstkd4192t7m7';
}

/**
 * CreateOS Sandbox Execution Client
 * Executes untrusted agent code in genuine CreateOS Firecracker Micro-VMs.
 */
export async function executeInSandbox(
  code: string,
  testSuite: string
): Promise<SandboxExecutionResult> {
  const startTime = Date.now();
  const sandboxId = await getOrCreateActiveSandbox();

  try {
    // Write isolated runner script supporting both require('./app.js') and direct invocation
    const tmpCode = path.join('/tmp', `run_${Date.now()}.js`);
    const fullScript = `
      const assert = require('assert');
      const appModule = { exports: {} };
      (function(module, exports) {
        ${code}
      })(appModule, appModule.exports);

      // Support require('./app.js') in test suites
      const _origRequire = typeof require !== 'undefined' ? require : null;
      const customRequire = function(modulePath) {
        if (modulePath === './app.js' || modulePath === '/workspace/app.js' || modulePath === 'app.js' || modulePath === './app') {
          return appModule.exports;
        }
        return _origRequire ? _origRequire(modulePath) : {};
      };

      // Expose to module environment
      const run = appModule.exports.run;
      module.exports = appModule.exports;

      // Execute test suite or runner wrapper
      (function(require) {
        ${testSuite}
      })(customRequire);
    `;
    fs.writeFileSync(tmpCode, fullScript, 'utf8');

    const checkPaused = (err: any) => {
      const allText = ((err?.stdout || '') + ' ' + (err?.stderr || '') + ' ' + (err?.message || ''));
      return allText.includes('is paused') || allText.includes('Resume it first');
    };

    // Push file to CreateOS micro-VM (handling auto-resume if paused)
    try {
      await runCreateOs(`createos sandbox push ${sandboxId} ${tmpCode} /workspace/app_test.js`);
    } catch (pushErr: any) {
      if (checkPaused(pushErr)) {
        console.log(`[CreateOS] Sandbox ${sandboxId} is paused. Resuming...`);
        await runCreateOs(`createos sandbox resume ${sandboxId}`);
        await runCreateOs(`createos sandbox push ${sandboxId} ${tmpCode} /workspace/app_test.js`);
      } else {
        throw pushErr;
      }
    }
    
    // Execute inside Firecracker micro-VM (handling auto-resume if paused)
    let execResult;
    try {
      execResult = await runCreateOs(`createos sandbox exec ${sandboxId} -- node /workspace/app_test.js`, 15000);
    } catch (execErr: any) {
      if (checkPaused(execErr)) {
        console.log(`[CreateOS] Sandbox ${sandboxId} is paused during exec. Resuming...`);
        await runCreateOs(`createos sandbox resume ${sandboxId}`);
        execResult = await runCreateOs(`createos sandbox exec ${sandboxId} -- node /workspace/app_test.js`, 15000);
      } else {
        throw execErr;
      }
    }

    const stdout = execResult.stdout || '';
    const stderr = execResult.stderr || '';

    try { fs.unlinkSync(tmpCode); } catch (e) {}

    return {
      stdout: stdout || 'TESTS PASSED',
      stderr: stderr || '',
      exitCode: 0,
      success: true,
      durationMs: Date.now() - startTime,
      isMicroVm: true,
      sandboxId,
    };
  } catch (err: any) {
    const stderr = err?.stderr || err?.message || 'Execution failed';
    const stdout = err?.stdout || '';
    return {
      stdout,
      stderr,
      exitCode: 1,
      success: false,
      durationMs: Date.now() - startTime,
      isMicroVm: true,
      sandboxId,
    };
  }
}
