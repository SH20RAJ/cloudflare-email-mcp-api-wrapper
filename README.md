# Cloudflare Email MCP + API Wrapper

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![MCP Endpoint](https://img.shields.io/badge/MCP-JSON--RPC-blue)](docs/MCP.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Wrangler](https://img.shields.io/badge/Wrangler-v4-orange)](https://developers.cloudflare.com/workers/wrangler/)

Deploy once on Cloudflare Workers, then send emails through:

- A simple REST API (`/send`)
- An MCP-compatible JSON-RPC endpoint (`/mcp`)

This project wraps Cloudflare's Email Workers send capability so app developers and AI agents can send emails without rebuilding SMTP or provider integrations in every app.

You do not need to publish this repository as an npm package to use it. The normal flow is to deploy the Worker to Cloudflare and call the deployed `/send` and `/mcp` endpoints.

## Why this project

Cloudflare's Email Workers send capability is powerful, but teams often need a reusable wrapper with:

- Standard API payloads
- Authentication
- CORS support
- MCP tool endpoint for AI agents
- OpenAPI docs
- Open-source docs and contribution process

This repo gives you that out of the box.

## Project status

- API: Ready
- MCP endpoint: Ready
- Legacy test route (`/?to=email@...`): Kept for compatibility

## What is built

- REST send endpoint with optional advanced fields: `cc`, `bcc`, `replyTo`, `headers`, `attachments`
- MCP JSON-RPC tool endpoint for AI agents (`/mcp`) with `tools/list` and `tools/call`
- Built-in docs landing page at `/docs`
- OpenAPI output at `/openapi.json`
- Optional API token auth for `/send` and `/mcp`

## Cloudflare email feature research (Apr 17, 2026)

Based on Cloudflare documentation:

- Email sending from Workers uses the `send_email` binding in `wrangler.jsonc`.
- You must enable Email Routing and verify destination addresses.
- Binding restrictions are supported:
  - `destination_address`
  - `allowed_destination_addresses`
  - `allowed_sender_addresses`
- Local development for Email Workers is documented as beta behavior and simulated by Wrangler.

References:

- https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/
- https://developers.cloudflare.com/email-routing/email-workers/reply-email-workers/
- https://developers.cloudflare.com/email-routing/email-workers/local-development/
- https://developers.cloudflare.com/workers/wrangler/configuration/

## Endpoints

- `GET /docs` or `GET /`: HTML docs page
- `GET /health`: health check
- `GET /openapi.json`: OpenAPI 3.1 document
- `POST /send`: send email via API
- `POST /mcp`: MCP-compatible JSON-RPC endpoint

## Quick start

### 1) Prerequisites

- Cloudflare account
- Email Routing enabled for your domain
- At least one verified destination address
- Wrangler installed/authenticated

If you need the Cloudflare token and account ID for legacy scripts or other API work, see [docs/SETUP.md](docs/SETUP.md).

### 2) Install

```bash
npm install
```

### 3) Configure worker

Edit `wrangler.jsonc` binding as needed:

```jsonc
{
  "send_email": [
    {
      "name": "EMAIL_SERVICE"
    }
  ]
}
```

Optional restrictions:

```jsonc
{
  "send_email": [
    {
      "name": "EMAIL_SERVICE",
      "allowed_destination_addresses": [
        "alerts@yourcompany.com",
        "ops@yourcompany.com"
      ]
    }
  ]
}
```

### 4) Set worker variables (recommended)

Use Wrangler secrets/vars:

- `API_TOKEN`: protects `/send` and `/mcp`
- `DEFAULT_SENDER`: default from email
- `DEFAULT_FROM_NAME`: default display name

Example:

```bash
wrangler secret put API_TOKEN
```

### 5) Run locally

```bash
npm run dev
```

### 6) Deploy

```bash
npm run deploy
```

## API usage

### Send an email

```bash
curl -X POST "https://<your-worker>.workers.dev/send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <API_TOKEN>" \
  -d '{
    "to": ["person@example.com"],
    "subject": "Hello from CF Worker",
    "text": "Plain text body",
    "html": "<h1>Hello</h1><p>HTML body</p>",
    "cc": ["cc@example.com"],
    "bcc": ["bcc@example.com"]
  }'
```

### Attachments

`attachments` accepts base64 payloads:

```json
{
  "to": "person@example.com",
  "subject": "Invoice",
  "text": "See attached",
  "attachments": [
    {
      "filename": "invoice.pdf",
      "contentType": "application/pdf",
      "data": "<base64-data>"
    }
  ]
}
```

## MCP usage

Use `/mcp` with JSON-RPC methods:

- `initialize`
- `tools/list`
- `tools/call`

Available tools:

- `send_email`
- `get_configuration`

See full MCP setup docs in [docs/MCP.md](docs/MCP.md), including AI-agent connection patterns.

## AI agent integrations

See [docs/AI_AGENTS.md](docs/AI_AGENTS.md) for examples across different agent setups.

### Ready-to-copy provider configs

All of these examples point to the same remote MCP endpoint:

- `https://<your worker>.workers.dev/mcp`

Use an environment variable or secret store for the token instead of hardcoding it.

#### Claude Code

Claude Code supports remote HTTP MCP servers directly:

```bash
claude mcp add --transport http cf-email https://<your worker>.shraj.workers.dev/mcp \
  --header "Authorization: Bearer $CF_EMAIL_API_TOKEN"
```

If you prefer JSON config, add this to `.mcp.json`:

```json
{
  "mcpServers": {
    "cf-email": {
      "type": "http",
      "url": "https://<your worker>.shraj.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer ${CF_EMAIL_API_TOKEN}"
      }
    }
  }
}
```

#### GitHub Copilot / VS Code

Create `.vscode/mcp.json` in your workspace, or open the user MCP configuration and add:

```json
{
  "servers": {
    "cf-email": {
      "type": "http",
      "url": "https://<your worker>.shraj.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer ${CF_EMAIL_API_TOKEN}"
      }
    }
  }
}
```

If your build still uses `transport` instead of `type`, keep the same URL and headers and swap that field to match your client version.

#### Cline

Cline can add a remote HTTP MCP server from the command line:

```bash
cline mcp add cf-email https://<your worker>.shraj.workers.dev/mcp --type http
```

Or configure it directly:

```json
{
  "mcpServers": {
    "cf-email": {
      "type": "streamableHttp",
      "url": "https://<your worker>.shraj.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer ${CF_EMAIL_API_TOKEN}"
      },
      "disabled": false
    }
  }
}
```

#### Kilo Code

Kilo Code stores MCP settings in `kilo.jsonc` or the MCP settings UI:

```json
{
  "mcp": {
    "cf-email": {
      "type": "remote",
      "url": "https://<your worker>.shraj.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer ${CF_EMAIL_API_TOKEN}"
      },
      "enabled": true
    }
  }
}
```

#### Google Antigravity

Open the MCP Store, then choose Manage MCP Servers and View raw config. The exact schema can vary by release, but the remote connection values are the same:

```json
{
  "mcpServers": {
    "cf-email": {
      "type": "http",
      "url": "https://<your worker>.shraj.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer ${CF_EMAIL_API_TOKEN}"
      }
    }
  }
}
```

#### Any other MCP client

If your client supports remote HTTP MCP servers, use the same URL and bearer token pattern:

```json
{
  "mcpServers": {
    "cf-email": {
      "type": "http",
      "url": "https://<your worker>.shraj.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer ${CF_EMAIL_API_TOKEN}"
      }
    }
  }
}
```

If your client only supports local stdio servers, use a bridge that forwards requests to the remote `/mcp` endpoint.

## Open-source docs

- [docs/SETUP.md](docs/SETUP.md)
- [docs/API.md](docs/API.md)
- [docs/MCP.md](docs/MCP.md)
- [docs/AI_AGENTS.md](docs/AI_AGENTS.md)
- [Cloudflare Send Emails Docs](https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/)
- [Cloudflare Reply Emails Docs](https://developers.cloudflare.com/email-routing/email-workers/reply-email-workers/)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [SECURITY.md](SECURITY.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## Disclaimer

This project is a wrapper around Cloudflare Email Workers behavior. Production delivery rules, rate limits, policy constraints, and account-level capability remain governed by Cloudflare.
