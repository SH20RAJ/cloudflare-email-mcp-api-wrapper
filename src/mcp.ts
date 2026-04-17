import { EmailOptions, createEmailMessage } from "./email";

export const MCP_VERSION = "2024-11-05";

export interface MCPRequest {
  method: string;
  params?: any;
  id?: string | number;
}

export interface MCPResponse {
  jsonrpc: "2.0";
  id?: string | number;
  result?: any;
  error?: any;
}

/**
 * Handles MCP JSON-RPC requests
 */
export async function handleMCPRequest(request: MCPRequest, env: any): Promise<MCPResponse> {
  const { method, params, id } = request;

  switch (method) {
    case "initialize":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: MCP_VERSION,
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: "Cloudflare Email MCP",
            version: "1.0.0"
          }
        }
      };

    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: [
            {
              name: "send_email",
              description: "Sends an email using the Cloudflare Email Service. Supports HTML and attachments.",
              inputSchema: {
                type: "object",
                properties: {
                  to: { type: "string", description: "Recipient email address" },
                  subject: { type: "string", description: "Email subject" },
                  text: { type: "string", description: "Plain text body" },
                  html: { type: "string", description: "HTML body (optional)" },
                  from: { type: "string", description: "Sender email (must be authorized domain)" }
                },
                required: ["to", "subject", "text"]
              }
            }
          ]
        }
      };

    case "tools/call":
      if (params.name === "send_email") {
        try {
          const options: EmailOptions = {
            from: params.arguments.from || env.DEFAULT_SENDER || "no-reply@mail.wify.my",
            to: params.arguments.to,
            subject: params.arguments.subject,
            text: params.arguments.text,
            html: params.arguments.html,
          };

          const message = await createEmailMessage(options);
          await env.EMAIL_SERVICE.send(message);

          return {
            jsonrpc: "2.0",
            id,
            result: {
              content: [
                {
                  type: "text",
                  text: `Email successfully sent to ${options.to}`
                }
              ]
            }
          };
        } catch (error: any) {
          return {
            jsonrpc: "2.0",
            id,
            error: {
              code: -32000,
              message: error.message
            }
          };
        }
      }
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: "Method not found"
        }
      };

    default:
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Method ${method} not implemented`
        }
      };
  }
}
