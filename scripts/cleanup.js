const { execSync } = require('child_process');

function run(cmd) {
  try { return execSync(cmd, { stdio: 'pipe', encoding: 'utf8', timeout: 5000 }).trim(); }
  catch { return ''; }
}

// Kill process on port 3000
const netstat = run('netstat -ano');
const lines = netstat.split('\n').filter(l => l.includes(':3000') && l.includes('LISTENING'));
for (const line of lines) {
  const parts = line.trim().split(/\s+/);
  const pid = parts[parts.length - 1];
  if (pid && pid !== '0') {
    try {
      execSync(`taskkill /f /pid ${pid}`, { stdio: 'pipe' });
      console.log(`[cleanup] Killed process on port 3000 (PID: ${pid})`);
    } catch {}
  }
}

// Kill ts-node processes running server.ts or agent.ts
const tasklist = run('tasklist /fi "imagename eq node.exe" /fo csv /nh');
for (const line of tasklist.split('\n').filter(Boolean)) {
  const parts = line.replace(/"/g, '').split(',');
  const pid = parts[1];
  if (!pid) continue;
  try {
    const cmdline = run(`wmic process where "processid=${pid}" get commandline`);
    if (cmdline.includes('server.ts') || cmdline.includes('agent.ts')) {
      execSync(`taskkill /f /pid ${pid}`, { stdio: 'pipe' });
      console.log(`[cleanup] Killed node process (PID: ${pid})`);
    }
  } catch {}
}
