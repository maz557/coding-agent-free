#!/usr/bin/env node
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin });

process.stdin.on('end', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
let msgId = 1;

// capabilities: we support tools
const capabilities = {
  tools: { listChanged: false },
};

// define one tool: echo
const tools = [
  {
    name: 'echo',
    description: 'Echoes back the input text',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'The text to echo back' },
      },
      required: ['text'],
    },
  },
];

// Handle incoming JSON-RPC messages
rl.on('line', (line) => {
  try {
    const msg = JSON.parse(line);
    handleMessage(msg);
  } catch { /* ignore */ }
});

function handleMessage(msg) {
  const { id, method, params } = msg;
  let result;

  switch (method) {
    case 'initialize':
      result = {
        protocolVersion: '2025-11-25',
        capabilities,
        serverInfo: { name: 'echo-server', version: '1.0.0' },
      };
      break;

    case 'notifications/initialized':
      // no response needed
      return;

    case 'tools/list':
      result = { tools };
      break;

    case 'tools/call':
      if (params.name === 'echo') {
        const text = params.arguments?.text || '';
        result = {
          content: [{ type: 'text', text: `Echo: ${text}` }],
        };
      } else {
        result = {
          content: [{ type: 'text', text: `Unknown tool: ${params.name}` }],
          isError: true,
        };
      }
      break;

    default:
      result = { error: { code: -32601, message: `Method not found: ${method}` } };
  }

  sendResponse(id, result);
}

function sendResponse(id, result) {
  const response = { jsonrpc: '2.0', id, ...result };
  process.stdout.write(JSON.stringify(response) + '\n');
}
