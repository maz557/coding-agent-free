const https = require('https');
const dotenv = require('dotenv');
dotenv.config();

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  console.error('ERROR: Set OPENROUTER_API_KEY in .env file');
  process.exit(1);
}

const options = {
  hostname: 'openrouter.ai',
  path: '/api/v1/models',
  headers: { 'Authorization': `Bearer ${apiKey}` }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const models = JSON.parse(data).data || [];
    const freeModels = models.filter(m => m.id.endsWith(':free'));
    
    console.log('=== Free Models with Tool Support ===\n');
    freeModels.filter(m => (m.supported_parameters||[]).includes('tools')).forEach(m => {
      console.log(`${m.id.padEnd(75)} ctx:${String(m.context_length||'?').padStart(8)}`);
    });
    
    console.log(`\n--- Total with tools: ${freeModels.filter(m => (m.supported_parameters||[]).includes('tools')).length} / ${freeModels.length} free models ---`);
    
    console.log('\n=== All Free Models ===\n');
    freeModels.forEach(m => {
      const hasTools = (m.supported_parameters||[]).includes('tools') ? '✅' : '❌';
      console.log(`${m.id.padEnd(75)} ctx:${String(m.context_length||'?').padStart(8)} tools:${hasTools}`);
    });
  });
}).on('error', (e) => {
  console.error('Error:', e.message);
});
