const { execSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

const targets = process.argv[2] || 'node18-win-x64';
const output = process.argv[3] || 'coding-agent' + (process.platform === 'win32' ? '.exe' : '');
const entry = path.join(__dirname, '..', 'dist', 'agent.js');

console.log('  Building standalone binary...');
console.log(`  Target: ${targets}`);
console.log(`  Output: ${output}\n`);

if (!existsSync(entry)) {
  console.log('  Step 1: Compiling TypeScript...');
  execSync('npx tsc', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
}

console.log('  Step 2: Packaging with pkg...');
execSync(`npx pkg ${entry} --targets ${targets} --output ${output}`, {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
});

console.log(`\n✅ Binary created: ${output}`);
console.log('  Run it with: ./' + output);
