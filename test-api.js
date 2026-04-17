const dotenv = require('dotenv');
dotenv.config();

const WORKER_URL = (process.env.WORKER_URL || '').replace(/\/$/, '');
const API_TOKEN = process.env.WORKER_API_TOKEN || '';
const TO = process.env.TEST_TO || 'recipient@example.com';
const FROM = process.env.TEST_FROM || 'noreply@example.com';
const SUBJECT = process.env.TEST_SUBJECT || 'Test Email from CF Email MCP API';

const authHeaders = API_TOKEN
  ? {
      Authorization: `Bearer ${API_TOKEN}`,
      'X-API-Key': API_TOKEN,
    }
  : {};

async function testSendEndpoint() {
  if (!WORKER_URL) {
    console.error('❌ Error: WORKER_URL is required in .env');
    process.exit(1);
  }

  const body = {
    to: [TO],
    from: FROM,
    subject: SUBJECT,
    html: `<h1>CF Email MCP + API</h1><p>Sent at ${new Date().toISOString()}</p>`,
    text: `CF Email MCP + API test. Sent at ${new Date().toISOString()}`,
  };

  try {
    const url = `${WORKER_URL}/send`;
    console.log(`Testing POST ${url}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ /send test failed:', error.message);
  }
}

async function testMcpToolsList() {
  try {
    const url = `${WORKER_URL}/mcp`;
    console.log(`Testing POST ${url} (tools/list)`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'tools-list',
        method: 'tools/list',
      }),
    });

    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ /mcp tools/list test failed:', error.message);
  }
}

async function run() {
  await testSendEndpoint();
  await testMcpToolsList();
}

run();
