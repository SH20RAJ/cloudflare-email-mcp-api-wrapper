# Add This MCP Server To AI Agents

Your deployed MCP endpoint:

- `https://<worker>.workers.dev/mcp`

Depending on the agent, you have two common patterns:

1) Native remote MCP URL support
2) Local stdio bridge (for clients that only support local MCP processes)

## Pattern 1: Native remote MCP URL

If your agent supports remote MCP HTTP endpoints directly, point it to:

- URL: `https://<worker>.workers.dev/mcp`
- Auth header: `Authorization: Bearer <API_TOKEN>` (if token enabled)

## Pattern 2: Bridge remote MCP to stdio

For clients requiring local stdio processes, use an MCP bridge/proxy that connects to your remote `/mcp` endpoint.

Conceptually:

- Agent <-> local bridge process (stdio)
- Bridge process <-> `https://<worker>.workers.dev/mcp` (HTTP JSON-RPC)

## Example config snippets

These are template examples. Field names can vary by client version.

### Generic JSON config

```json
{
  "mcpServers": {
    "cf-email": {
      "transport": "http",
      "url": "https://<worker>.workers.dev/mcp",
      "headers": {
        "Authorization": "Bearer <API_TOKEN>"
      }
    }
  }
}
```

### Generic stdio bridge config

```json
{
  "mcpServers": {
    "cf-email": {
      "command": "npx",
      "args": [
        "-y",
        "<your-mcp-http-bridge-package>",
        "https://<worker>.workers.dev/mcp"
      ],
      "env": {
        "MCP_AUTH_HEADER": "Bearer <API_TOKEN>"
      }
    }
  }
}
```

## Best-practice prompt for agents

Use this system instruction in your agent when calling this MCP tool:

- Use `send_email` only for user-approved recipients.
- Always include a clear subject and plain-text body.
- Avoid sending attachments unless explicitly requested.
- If a send fails, show the per-recipient failure details and ask for correction.

## Operational tips

- Use a dedicated sender mailbox (`noreply@...` or `alerts@...`).
- Restrict destination allowlists in `wrangler.jsonc` for safety.
- Keep `API_TOKEN` secret and rotate periodically.
- Add logging/analytics for production-grade observability.
