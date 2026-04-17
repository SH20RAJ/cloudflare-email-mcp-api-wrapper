import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

export interface Env {
  EMAIL_SERVICE: any;
  API_TOKEN?: string;
  DEFAULT_SENDER?: string;
  DEFAULT_FROM_NAME?: string;
}

type Json = Record<string, unknown>;

type AttachmentInput = {
  filename: string;
  contentType?: string;
  data: string;
  inline?: boolean;
  headers?: Record<string, string>;
};

type SendEmailInput = {
  to: string | string[];
  from?: string;
  fromName?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  headers?: Record<string, string>;
  attachments?: AttachmentInput[];
};

const json = (payload: unknown, init?: ResponseInit): Response => {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(payload, null, 2), {
    ...init,
    headers,
  });
};

const html = (content: string, init?: ResponseInit): Response => {
  const headers = new Headers(init?.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  return new Response(content, {
    ...init,
    headers,
  });
};

const withCors = (response: Response): Response => {
  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  headers.set("access-control-allow-headers", "Content-Type, Authorization, X-API-Key");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const normalizeRecipients = (value?: string | string[]): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => item.trim()).filter(Boolean);
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseJsonBody = async (request: Request): Promise<Json> => {
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Request body must be a JSON object");
    }
    return parsed as Json;
  } catch (error) {
    throw new Error(`Invalid JSON payload: ${(error as Error).message}`);
  }
};

const toText = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const validateSendInput = (input: Json, env: Env): SendEmailInput => {
  const to = input.to as string | string[] | undefined;
  const subject = toText(input.subject);
  const text = toText(input.text);
  const htmlBody = toText(input.html);

  if (!to || normalizeRecipients(to).length === 0) {
    throw new Error("Field 'to' is required and must be a non-empty email or list of emails.");
  }
  if (!subject) {
    throw new Error("Field 'subject' is required.");
  }
  if (!text && !htmlBody) {
    throw new Error("At least one of 'text' or 'html' is required.");
  }

  const from = toText(input.from) || toText(env.DEFAULT_SENDER) || "test@example.com";
  const fromName =
    toText(input.fromName ?? input.from_name) ||
    toText(env.DEFAULT_FROM_NAME) ||
    "Cloudflare Email MCP";

  const headers = (input.headers ?? {}) as Record<string, string>;
  const attachments = (input.attachments ?? []) as AttachmentInput[];

  if (!Array.isArray(attachments)) {
    throw new Error("Field 'attachments' must be an array when provided.");
  }

  return {
    to,
    from,
    fromName,
    cc: input.cc as string | string[] | undefined,
    bcc: input.bcc as string | string[] | undefined,
    replyTo: (input.replyTo ?? input.reply_to) as string | string[] | undefined,
    subject,
    text,
    html: htmlBody,
    headers,
    attachments,
  };
};

const sendEmail = async (env: Env, payload: SendEmailInput) => {
  const toRecipients = normalizeRecipients(payload.to);
  const ccRecipients = normalizeRecipients(payload.cc);
  const bccRecipients = normalizeRecipients(payload.bcc);
  const replyToRecipients = normalizeRecipients(payload.replyTo);

  const mime = createMimeMessage();
  mime.setSender({
    name: payload.fromName || "Cloudflare Email MCP",
    addr: payload.from || "test@example.com",
  });
  mime.setRecipients(toRecipients);
  if (ccRecipients.length) mime.setCc(ccRecipients);
  if (bccRecipients.length) mime.setBcc(bccRecipients);
  if (replyToRecipients.length) mime.setHeader("Reply-To", replyToRecipients.join(", "));

  mime.setSubject(payload.subject);

  if (payload.text) {
    mime.addMessage({
      contentType: "text/plain",
      data: payload.text,
    });
  }
  if (payload.html) {
    mime.addMessage({
      contentType: "text/html",
      data: payload.html,
    });
  }

  for (const [header, value] of Object.entries(payload.headers || {})) {
    if (typeof value === "string" && value.trim()) {
      mime.setHeader(header, value);
    }
  }

  for (const attachment of payload.attachments || []) {
    if (!attachment?.filename || !attachment?.data) {
      throw new Error("Each attachment must include 'filename' and base64 'data'.");
    }
    mime.addAttachment({
      filename: attachment.filename,
      contentType: attachment.contentType || "application/octet-stream",
      data: attachment.data,
      inline: Boolean(attachment.inline),
      headers: attachment.headers,
    });
  }

  const raw = mime.asRaw();
  const results: Array<{ recipient: string; ok: boolean; error?: string }> = [];

  for (const recipient of toRecipients) {
    try {
      const message = new EmailMessage(payload.from || "test@example.com", recipient, raw);
      await env.EMAIL_SERVICE.send(message);
      results.push({ recipient, ok: true });
    } catch (error) {
      results.push({ recipient, ok: false, error: (error as Error).message });
    }
  }

  return {
    total: results.length,
    delivered: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results,
  };
};

const isAuthorized = (request: Request, env: Env): boolean => {
  if (!env.API_TOKEN) return true;
  const authHeader = request.headers.get("authorization") || "";
  const apiKeyHeader = request.headers.get("x-api-key") || "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  return bearer === env.API_TOKEN || apiKeyHeader === env.API_TOKEN;
};

const docsPage = (baseUrl: string) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Cloudflare Email MCP + API Docs</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      font-family: "IBM Plex Sans", "Avenir Next", sans-serif;
      background: radial-gradient(circle at 15% 0%, #f4f9ff 0%, #e9f4ff 28%, #e7eff5 58%, #f5f9fc 100%);
      color: #1b2730;
    }
    .container {
      max-width: 1080px;
      margin: 0 auto;
      padding: 2rem 1rem 5rem;
    }
    h1 { font-size: clamp(2rem, 4vw, 3rem); margin: 0 0 0.6rem; }
    h2 { margin-top: 0; }
    p { line-height: 1.6; }

    .hero {
      position: relative;
      background: linear-gradient(125deg, #07243a 0%, #0f3d56 50%, #245768 100%);
      color: #eff8ff;
      border-radius: 24px;
      padding: 2rem;
      overflow: hidden;
      box-shadow: 0 24px 48px rgba(9, 43, 67, 0.22);
    }

    .hero::after {
      content: "";
      position: absolute;
      width: 320px;
      height: 320px;
      right: -80px;
      top: -100px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(146, 225, 255, 0.4) 0%, rgba(146, 225, 255, 0.02) 68%);
    }

    .hero p {
      max-width: 680px;
      color: #d8edf8;
    }

    .hero-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.7rem;
      margin-top: 1rem;
    }

    .hero-actions a {
      text-decoration: none;
      border-radius: 999px;
      padding: 0.55rem 0.95rem;
      font-weight: 600;
      font-size: 0.9rem;
      border: 1px solid rgba(226, 247, 255, 0.33);
      color: #ecf8ff;
      background: rgba(255, 255, 255, 0.08);
      backdrop-filter: blur(3px);
    }

    .hero-actions a.primary {
      background: #eff8ff;
      color: #0d324b;
      border-color: #eff8ff;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .card {
      background: rgba(255, 255, 255, 0.88);
      border: 1px solid #d4e4ef;
      border-radius: 16px;
      padding: 1rem;
      margin-top: 1rem;
      box-shadow: 0 12px 28px rgba(21, 52, 78, 0.08);
    }

    code, pre {
      font-family: "IBM Plex Mono", "Menlo", monospace;
      font-size: 0.92rem;
    }
    pre {
      background: #0b1e2c;
      color: #e8f5ff;
      border-radius: 10px;
      padding: 0.95rem;
      overflow: auto;
    }

    .endpoint-pill {
      display: inline-block;
      background: #e7f3ff;
      border: 1px solid #c8def5;
      color: #123954;
      border-radius: 999px;
      padding: 0.25rem 0.58rem;
      margin-right: 0.35rem;
      margin-bottom: 0.35rem;
      font-size: 0.8rem;
      font-weight: 600;
    }

    .route-list {
      display: grid;
      gap: 0.55rem;
      margin-top: 0.7rem;
    }

    .route {
      border: 1px solid #d3e4f2;
      background: #f8fcff;
      border-radius: 11px;
      padding: 0.7rem;
    }

    .method {
      display: inline-block;
      font-size: 0.75rem;
      letter-spacing: 0.04em;
      font-weight: 700;
      border-radius: 6px;
      padding: 0.2rem 0.4rem;
      background: #0e3d59;
      color: #eaf8ff;
      margin-right: 0.45rem;
    }

    .tiny {
      color: #4a6073;
      font-size: 0.89rem;
      margin-top: 0.45rem;
    }

    @media (max-width: 700px) {
      .container { padding-top: 1rem; }
      .hero { padding: 1.2rem; border-radius: 18px; }
    }
  </style>
</head>
<body>
  <main class="container">
    <section class="hero">
      <h1>Cloudflare Email MCP + API Wrapper</h1>
      <p>
        This worker is a deploy-once email gateway for apps and AI agents. It wraps Cloudflare Email Workers,
        exposes a secure REST send endpoint, and ships an MCP JSON-RPC tool server at <b>/mcp</b>.
      </p>
      <div class="hero-actions">
        <a class="primary" href="${baseUrl}/openapi.json">OpenAPI</a>
        <a href="${baseUrl}/health">Health</a>
        <a href="https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/" target="_blank" rel="noreferrer">Cloudflare Send Docs</a>
        <a href="https://developers.cloudflare.com/email-routing/email-workers/reply-email-workers/" target="_blank" rel="noreferrer">Cloudflare Reply Docs</a>
      </div>
    </section>

    <div class="grid">
      <div class="card" style="margin-top: 1rem;">
        <h2>What Is Built</h2>
        <div class="route-list">
          <div class="route"><span class="method">REST</span> Email send API with optional cc, bcc, replyTo, headers, attachments.</div>
          <div class="route"><span class="method">MCP</span> JSON-RPC endpoint with tools/list and tools/call for agent use.</div>
          <div class="route"><span class="method">OPS</span> CORS, optional API token auth, per-recipient delivery results.</div>
        </div>
      </div>

      <div class="card" style="margin-top: 1rem;">
        <h2>Available Routes</h2>
        <div class="route-list">
          <div class="route"><span class="method">GET</span> /docs</div>
          <div class="route"><span class="method">GET</span> /health</div>
          <div class="route"><span class="method">GET</span> /openapi.json</div>
          <div class="route"><span class="method">POST</span> /send</div>
          <div class="route"><span class="method">POST</span> /mcp</div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="endpoint-pill">REST</div>
      <div class="endpoint-pill">Optional Fields: cc, bcc, replyTo, attachments</div>
      <h2>Quick Send Example</h2>
      <pre>curl -X POST '${baseUrl}/send' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer &lt;API_TOKEN&gt;' \\
  -d '{
    "to": ["you@example.com"],
    "subject": "Hello from Cloudflare",
    "text": "Email via API wrapper",
    "cc": ["ops@example.com"],
    "bcc": ["audit@example.com"],
    "replyTo": ["support@example.com"]
  }'</pre>
    </div>

    <div class="card">
      <div class="endpoint-pill">MCP</div>
      <h2>MCP Tool Call Example</h2>
      <pre>curl -X POST '${baseUrl}/mcp' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer &lt;API_TOKEN&gt;' \\
  -d '{
    "jsonrpc":"2.0",
    "id":"send-1",
    "method":"tools/call",
    "params":{
      "name":"send_email",
      "arguments":{
        "to":["you@example.com"],
        "subject":"MCP send",
        "text":"Message sent via MCP tool"
      }
    }
  }'</pre>
      <p class="tiny">Base URL: ${baseUrl}</p>
    </div>
  </main>
</body>
</html>`;

const openApi = (origin: string) => ({
  openapi: "3.1.0",
  info: {
    title: "CF Email MCP + API Wrapper",
    version: "1.0.0",
    description: "Send emails from Cloudflare Workers using REST or MCP tool calls.",
  },
  servers: [{ url: origin }],
  paths: {
    "/health": {
      get: {
        summary: "Health check",
        responses: { "200": { description: "OK" } },
      },
    },
    "/send": {
      post: {
        summary: "Send an email",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["to", "subject"],
                properties: {
                  to: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
                  from: { type: "string" },
                  fromName: { type: "string" },
                  cc: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
                  bcc: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
                  replyTo: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
                  subject: { type: "string" },
                  text: { type: "string" },
                  html: { type: "string" },
                  headers: { type: "object", additionalProperties: { type: "string" } },
                  attachments: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["filename", "data"],
                      properties: {
                        filename: { type: "string" },
                        contentType: { type: "string" },
                        data: { type: "string", description: "Base64 payload" },
                        inline: { type: "boolean" },
                        headers: { type: "object", additionalProperties: { type: "string" } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Sent" },
          "400": { description: "Validation error" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/mcp": {
      post: {
        summary: "MCP-compatible JSON-RPC endpoint",
        responses: { "200": { description: "JSON-RPC response" } },
      },
    },
  },
});

const mcpTools = [
  {
    name: "send_email",
    description: "Send an email using the Cloudflare send_email binding.",
    inputSchema: {
      type: "object",
      required: ["to", "subject"],
      properties: {
        to: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
        from: { type: "string" },
        fromName: { type: "string" },
        cc: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
        bcc: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
        replyTo: { oneOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] },
        subject: { type: "string" },
        text: { type: "string" },
        html: { type: "string" },
        headers: { type: "object", additionalProperties: { type: "string" } },
        attachments: {
          type: "array",
          items: {
            type: "object",
            required: ["filename", "data"],
            properties: {
              filename: { type: "string" },
              contentType: { type: "string" },
              data: { type: "string", description: "Base64 payload" },
              inline: { type: "boolean" },
              headers: { type: "object", additionalProperties: { type: "string" } },
            },
          },
        },
      },
    },
  },
  {
    name: "get_configuration",
    description: "Return worker-level configuration details for this MCP server.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
];

const buildMcpResponse = (id: unknown, result: unknown) => json({ jsonrpc: "2.0", id, result });
const buildMcpError = (id: unknown, code: number, message: string) =>
  json({ jsonrpc: "2.0", id, error: { code, message } }, { status: 400 });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }));
    }

    if (path === "/" && request.method === "GET" && url.searchParams.has("to")) {
      const recipient = url.searchParams.get("to") || "";
      const payload: SendEmailInput = {
        to: recipient,
        from: env.DEFAULT_SENDER || "test@example.com",
        fromName: env.DEFAULT_FROM_NAME || "Cloudflare Email MCP",
        subject: "Test Email from Cloudflare Worker",
        text: "This email was sent using the Cloudflare Worker send_email binding.",
      };

      try {
        const result = await sendEmail(env, payload);
        return withCors(json({ ok: true, legacy: true, ...result }));
      } catch (error) {
        return withCors(json({ ok: false, error: (error as Error).message }, { status: 500 }));
      }
    }

    if (path === "/" || path === "/docs") {
      return withCors(html(docsPage(url.origin)));
    }

    if (path === "/openapi.json") {
      return withCors(json(openApi(url.origin)));
    }

    if (path === "/health") {
      return withCors(json({ ok: true, service: "cf-email-mcp-api", date: new Date().toISOString() }));
    }

    if (path === "/mcp" && request.method === "GET") {
      return withCors(
        json({
          name: "cf-email-mcp-api",
          transport: "json-rpc-over-http",
          endpoint: `${url.origin}/mcp`,
          hint: "Send JSON-RPC requests with methods: initialize, tools/list, tools/call",
        })
      );
    }

    if (!isAuthorized(request, env)) {
      return withCors(json({ error: "Unauthorized" }, { status: 401 }));
    }

    if (path === "/mcp" && request.method === "POST") {
      let rpc: Json;
      try {
        rpc = await parseJsonBody(request);
      } catch (error) {
        return withCors(buildMcpError(null, -32700, (error as Error).message));
      }
      const id = rpc.id;
      const method = rpc.method;

      if (typeof method !== "string") {
        return withCors(buildMcpError(id, -32600, "Invalid Request: method is required"));
      }

      if (method === "initialize") {
        return withCors(
          buildMcpResponse(id, {
            protocolVersion: "2024-11-05",
            capabilities: {
              tools: { listChanged: false },
            },
            serverInfo: {
              name: "cf-email-mcp-api",
              version: "1.0.0",
            },
          })
        );
      }

      if (method === "notifications/initialized") {
        return withCors(new Response(null, { status: 204 }));
      }

      if (method === "tools/list") {
        return withCors(buildMcpResponse(id, { tools: mcpTools }));
      }

      if (method === "tools/call") {
        const params = (rpc.params ?? {}) as Json;
        const toolName = params.name;
        const args = (params.arguments ?? {}) as Json;

        if (toolName === "get_configuration") {
          return withCors(
            buildMcpResponse(id, {
              content: [
                {
                  type: "text",
                  text: "Configuration returned successfully.",
                },
              ],
              structuredContent: {
                hasApiToken: Boolean(env.API_TOKEN),
                defaultSender: env.DEFAULT_SENDER ?? null,
                defaultFromName: env.DEFAULT_FROM_NAME ?? null,
                bindingName: "EMAIL_SERVICE",
              },
            })
          );
        }

        if (toolName === "send_email") {
          try {
            const payload = validateSendInput(args, env);
            const result = await sendEmail(env, payload);
            return withCors(
              buildMcpResponse(id, {
                content: [
                  {
                    type: "text",
                    text: `Delivery attempted for ${result.total} recipient(s). Delivered: ${result.delivered}. Failed: ${result.failed}.`,
                  },
                ],
                structuredContent: result,
              })
            );
          } catch (error) {
            return withCors(buildMcpError(id, -32000, (error as Error).message));
          }
        }

        return withCors(buildMcpError(id, -32601, `Unknown tool: ${String(toolName)}`));
      }

      return withCors(buildMcpError(id, -32601, `Method not found: ${method}`));
    }

    if (path === "/send" && request.method === "POST") {
      try {
        const body = await parseJsonBody(request);
        const payload = validateSendInput(body, env);
        const result = await sendEmail(env, payload);
        return withCors(json({ ok: true, ...result }));
      } catch (error) {
        return withCors(json({ ok: false, error: (error as Error).message }, { status: 400 }));
      }
    }

    return withCors(json({ error: "Not found" }, { status: 404 }));
  },
};
