import express from 'express';
const app = express();
app.use(express.json());
app.post('/api/session', (req, res) => {
  console.log('content-type:', req.get('content-type'));
  console.log('body:', JSON.stringify(req.body));
  res.json({ sessionId: 'test-123' });
});
const server = app.listen(0, () => {
  const port = server.address().port;
  // Test 1: With Content-Type header, no body
  fetch(`http://localhost:${port}/api/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
    .then(r => r.json())
    .then(b => console.log('Test 1 (json header, no body):', JSON.stringify(b)))
    .catch(e => console.log('Test 1 error:', e.message))
    // Test 2: Without Content-Type header, no body
    .then(() => fetch(`http://localhost:${port}/api/session`, { method: 'POST' }))
    .then(r => r.json())
    .then(b => console.log('Test 2 (no json header, no body):', JSON.stringify(b)))
    .catch(e => console.log('Test 2 error:', e.message))
    // Test 3: With Content-Type + empty body
    .then(() => fetch(`http://localhost:${port}/api/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }))
    .then(r => r.json())
    .then(b => console.log('Test 3 (json header + body:{}):', JSON.stringify(b)))
    .catch(e => console.log('Test 3 error:', e.message))
    .finally(() => server.close());
});
