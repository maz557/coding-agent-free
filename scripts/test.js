/**
 * Non-interactive test for the Coding Agent.
 * Spawns the agent process and feeds commands line-by-line with delays.
 */
const { spawn } = require('child_process');

const commands = [
  '/models',
  '/model 1',
  'say hello in one word',
  'list files in workspace directory',
  '/exit',
];

const proc = spawn('node', ['node_modules/ts-node/dist/bin.js', 'src/agent.ts'], {
  cwd: require('path').join(__dirname, '..'),
  stdio: ['pipe', 'inherit', 'inherit'],
});

let i = 0;
const timer = setInterval(() => {
  if (i >= commands.length) {
    clearInterval(timer);
    return;
  }
  proc.stdin.write(commands[i] + '\n');
  i++;
}, 2000);

proc.on('close', code => {
  clearInterval(timer);
  console.log(`\n━━━ Test finished with exit code ${code} ━━━`);
  process.exit(code ?? 0);
});

setTimeout(() => {
  console.error('\n⏰ Test timed out after 120s');
  proc.kill();
  process.exit(1);
}, 120000);
