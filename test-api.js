const dotenv = require('dotenv');
dotenv.config();

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '091539408595ba99a0ef106d42391d5b';
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const SENDER = process.env.SENDER_EMAIL || 'test@mail.wify.my';
const RECIPIENT = process.env.RECIPIENT_EMAIL || 'shaswatraj3@gmail.com';

async function sendTestEmail() {
  if (!API_TOKEN) {
    console.error('❌ Error: CLOUDFLARE_API_TOKEN is not set in .env');
    process.exit(1);
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/email/sending/send`;

  const body = {
    to: RECIPIENT,
    from: SENDER,
    subject: 'Mail.wify.my Test Email',
    html: `
      <h1>Hello from mail.wify.my!</h1>
      <p>This is a test email sent via the Cloudflare Email Service REST API.</p>
      <hr>
      <p><small>Sent at: ${new Date().toISOString()}</small></p>
    `,
    text: `Hello from mail.wify.my! This is a test email sent via the Cloudflare Email Service REST API. Sent at: ${new Date().toISOString()}`
  };

  try {
    console.log(`Sending email from ${SENDER} to ${RECIPIENT}...`);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Success! Email sent.');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error('❌ Failed to send email.');
      console.error(`Status: ${response.status}`);
      console.error(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

sendTestEmail();
