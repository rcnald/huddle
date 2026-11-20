import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const useShell = process.platform === 'win32';

let activeChild;
let receivedSignal;
let ownsApiContainer = false;

function handleSignal(signal) {
  if (receivedSignal) return;
  receivedSignal = signal;
  process.exitCode = signal === 'SIGINT' ? 130 : 143;
  activeChild?.kill(signal);
}

process.on('SIGINT', () => handleSignal('SIGINT'));
process.on('SIGTERM', () => handleSignal('SIGTERM'));

function run(executable, args, { captureOutput = false } = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(executable, args, {
      cwd: projectRoot,
      stdio: captureOutput ? ['ignore', 'pipe', 'inherit'] : 'inherit',
      shell: useShell,
    });
    let output = '';
    activeChild = child;

    if (captureOutput) child.stdout.setEncoding('utf8').on('data', (chunk) => (output += chunk));

    child.once('error', (error) => {
      if (activeChild === child) activeChild = undefined;
      rejectRun(error);
    });
    child.once('close', (code, signal) => {
      if (activeChild === child) activeChild = undefined;
      if (receivedSignal || code === 0) {
        resolveRun({ code: code ?? 0, output });
        return;
      }
      rejectRun(new Error(`${executable} ${args.join(' ')} terminou com código ${code ?? signal}.`));
    });
  });
}

async function apiIsReady() {
  try {
    const response = await fetch('http://127.0.0.1:4000/api/health', {
      signal: AbortSignal.timeout(1000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForApi() {
  const deadline = Date.now() + 30_000;
  while (!receivedSignal && Date.now() < deadline) {
    if (await apiIsReady()) return true;
    await delay(500);
  }
  return false;
}

async function main() {
  try {
    const { output } = await run('docker', ['compose', 'ps', '--services'], {
      captureOutput: true,
    });
    if (receivedSignal) return;

    const apiWasRunning = output.trim().split(/\s+/).includes('api');
    ownsApiContainer = !apiWasRunning;

    if (receivedSignal) return;

    await run('docker', ['compose', 'up', '--build', '-d', 'api']);
    if (receivedSignal) return;

    if (!(await waitForApi())) {
      if (!receivedSignal) throw new Error('A API não ficou saudável em 30 segundos.');
      return;
    }

    console.log('[dev] API pronta em http://localhost:4000. Iniciando Expo com túnel...');
    console.log('[dev] Configure EXPO_PUBLIC_API_URL com uma URL acessível pelo celular para conectar à API.');
    await run(command, ['run', 'start:tunnel', '--workspace', '@huddle/mobile']);
  } catch (error) {
    if (!receivedSignal) {
      console.error(`[dev] ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    }
  } finally {
    if (ownsApiContainer) {
      try {
        await run('docker', ['compose', 'down']);
      } catch (error) {
        if (!receivedSignal) {
          console.error(
            `[dev] Não foi possível parar o Compose: ${error instanceof Error ? error.message : String(error)}`,
          );
          process.exitCode = 1;
        }
      }
    }
  }
}

void main();
