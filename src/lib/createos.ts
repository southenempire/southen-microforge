import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

export interface SandboxExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  success: boolean;
  durationMs: number;
  isMicroVm: boolean;
  sandboxId?: string;
}

// Active sandbox ID cache
let activeSandboxId = 'sb-01m5602eqtye91wfs96kvyn6ed';

async function getOrCreateActiveSandbox(): Promise<string> {
  // Check if current sandbox is running
  if (activeSandboxId) {
    try {
      const { stdout } = await execAsync('createos sandbox list --quiet');
      if (stdout.includes(activeSandboxId)) {
        return activeSandboxId;
      }
    } catch (e) {
      // ignore
    }
  }

  // Create a fresh CreateOS Firecracker micro-VM
  try {
    const { stdout } = await execAsync('createos sandbox create --shape s-1vcpu-1gb --rootfs devbox:1 --auto-pause 10m');
    const match = stdout.match(/\((sb-[a-z0-9]+)\)/);
    if (match && match[1]) {
      activeSandboxId = match[1];
      return activeSandboxId;
    }
  } catch (err) {
    console.warn('[CreateOS Sandbox] Error creating sandbox via CLI:', err);
  }

  return activeSandboxId || 'sb-01m5602eqtye91wfs96kvyn6ed';
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

    // Push file to CreateOS micro-VM (handling auto-resume if paused)
    try {
      await execAsync(`createos sandbox push ${sandboxId} ${tmpCode} /workspace/app_test.js`);
    } catch (pushErr: any) {
      if ((pushErr?.stderr || pushErr?.message || '').includes('is paused')) {
        console.log(`[CreateOS] Sandbox ${sandboxId} is paused. Resuming...`);
        await execAsync(`createos sandbox resume ${sandboxId}`);
        await execAsync(`createos sandbox push ${sandboxId} ${tmpCode} /workspace/app_test.js`);
      } else {
        throw pushErr;
      }
    }
    
    // Execute inside Firecracker micro-VM (handling auto-resume if paused)
    let execResult;
    try {
      execResult = await execAsync(`createos sandbox exec ${sandboxId} -- node /workspace/app_test.js`, {
        timeout: 15000
      });
    } catch (execErr: any) {
      if ((execErr?.stderr || execErr?.message || '').includes('is paused')) {
        console.log(`[CreateOS] Sandbox ${sandboxId} is paused during exec. Resuming...`);
        await execAsync(`createos sandbox resume ${sandboxId}`);
        execResult = await execAsync(`createos sandbox exec ${sandboxId} -- node /workspace/app_test.js`, {
          timeout: 15000
        });
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
