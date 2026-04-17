# Cloudflare Email MCP & API Wrapper 📧

[![Visitors](https://visitorbadge.io/api/visitors?path=SH20RAJ%2Fcloudflare-email-mcp-api-wrapper&label=visitors&labelColor=%23263759&countColor=%230a7f5a)](https://visitorbadge.io/status?path=SH20RAJ%2Fcloudflare-email-mcp-api-wrapper)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![MCP Endpoint](https://img.shields.io/badge/MCP-JSON--RPC-0B4F75)](docs/MCP.md)
[![Wrangler](https://img.shields.io/badge/Wrangler-v4-orange)](https://developers.cloudflare.com/workers/wrangler/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Deploy Target](https://img.shields.io/badge/deploy-cloudflare%20workers-blue)](https://cf-email-mcp-api.shraj.workers.dev)

An open-source, production-ready Cloudflare Worker that exposes a JSON API and a **Model Context Protocol (MCP)** server for sending emails via Cloudflare's Email Service.

## Features
- **MCP Server**: Connect directly to AI agents (Claude, Gemini, etc.) to send emails.
- **REST API**: Simple JSON endpoint for traditional application integration.
- **Advanced Email Support**: HTML bodies, multiple recipients (To, CC, BCC), and attachments.
- **Edge Performance**: Built on Cloudflare Workers for global low-latency.
- **Secure**: Bearer token authentication for both API and MCP endpoints.

## Quick Start (Deploy Once)

### 1. Prerequisites
- A Cloudflare account with a domain configured for **Email Routing**.
- `bun` or `npm` installed.

### 2. Installation
```bash
git clone https://github.com/yourusername/cf-email-mcp-api.git
cd cf-email-mcp-api
bun install
```

### 3. Configuration
Copy `.dev.vars.example` to `.dev.vars` and fill in your local values:
- `API_TOKEN`: A secure token for endpoint authentication.
- `DEFAULT_SENDER`: An authorized email address from your Email Routing domain.
- `DEFAULT_FROM_NAME`: Optional sender display name.

### 4. Deploy
```bash
bun run deploy
```

---

## 🤖 AI Agent Integration (MCP)

### Adding to Claude Desktop
Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cf-email": {
      "transport": "http",
      "url": "https://your-worker.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_TOKEN"
      }
    }
  }
}
```

### Adding to Gemini / Antigravity
Add to your `mcp_config.json`:

```json
{
  "mcpServers": {
    "cf-email": {
      "transport": "http",
      "url": "https://your-worker.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_TOKEN"
      }
    }
  }
}
```

---

## 🛠️ API Reference

### Send Email
`POST /api/send`

**Headers:**
- `Authorization: Bearer YOUR_API_TOKEN`
- `Content-Type: application/json`

**Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Hello from API",
  "html": "<h1>Professional Email</h1><p>Sent via Cloudflare Workers.</p>",
  "attachments": [
    {
      "name": "report.pdf",
      "type": "application/pdf",
      "data": "BASE64_ENCODED_DATA"
    }
  ]
}
```

## License
MIT
