# MCP Endpoint Guide

This project exposes an MCP-compatible JSON-RPC endpoint at:

- `POST /mcp`

## Supported methods

- `initialize`
- `notifications/initialized`
- `tools/list`
- `tools/call`

## Available tools

### send_email

Inputs match the API payload shape (`to`, `subject`, `text/html`, `cc`, `bcc`, `replyTo`, `headers`, `attachments`, etc.).

Optional arguments for `send_email` include:

- `from`
- `fromName`
- `cc`
- `bcc`
- `replyTo`
- `headers`
- `attachments`

### get_configuration

Returns runtime configuration metadata:

- `hasApiToken`
- `defaultSender`
- `defaultFromName`
- `bindingName`

## MCP examples

### Initialize

```bash
curl -X POST "https://<worker>.workers.dev/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"1","method":"initialize","params":{}}'
```

### List tools

```bash
curl -X POST "https://<worker>.workers.dev/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"2","method":"tools/list"}'
```

### Call send_email

```bash
curl -X POST "https://<worker>.workers.dev/mcp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <API_TOKEN>" \
  -d '{
    "jsonrpc":"2.0",
    "id":"3",
    "method":"tools/call",
    "params":{
      "name":"send_email",
      "arguments":{
        "to":["person@example.com"],
        "subject":"MCP test",
        "text":"Sent through MCP",
        "cc":["ops@example.com"],
        "bcc":["audit@example.com"],
        "replyTo":["support@example.com"]
      }
    }
  }'
```

### Call send_email with attachments

```bash
curl -X POST "https://<worker>.workers.dev/mcp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <API_TOKEN>" \
  -d '{
    "jsonrpc":"2.0",
    "id":"4",
    "method":"tools/call",
    "params":{
      "name":"send_email",
      "arguments":{
        "to":["person@example.com"],
        "subject":"Attachment test",
        "text":"See attachment",
        "attachments":[
          {
            "filename":"hello.txt",
            "contentType":"text/plain",
            "data":"SGVsbG8gQ2xvdWRmbGFyZQ=="
          }
        ]
      }
    }
  }'
```

## Security recommendations

- Always set `API_TOKEN` in production.
- Restrict destinations at the binding layer (`allowed_destination_addresses`) when possible.
- Keep sender allowlists in Cloudflare binding config where available.
