import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { handleMCPRequest } from "./mcp";
import { EmailOptions, createEmailMessage } from "./email";
import { z } from "zod";

const app = new Hono<{ Bindings: { EMAIL_SERVICE: any; API_TOKEN: string; DEFAULT_SENDER: string } }>();

// Authentication Middleware
app.use("*", async (c, next) => {
  const token = c.env.API_TOKEN;
  if (!token) return await next(); // In dev or if no token set
  return bearerAuth({ token })(c, next);
});

// JSON API Route
app.post("/api/send", async (c) => {
  const body = await c.req.json();
  
  // Basic validation
  const schema = z.object({
    to: z.union([z.string(), z.array(z.string())]),
    subject: z.string(),
    text: z.string().optional(),
    html: z.string().optional(),
    attachments: z.array(z.object({
      name: z.string(),
      type: z.string(),
      data: z.string()
    })).optional()
  });

  const result = schema.safeParse(body);
  if (!result.success) return c.json({ error: result.error }, 400);

  try {
    const options: EmailOptions = {
      from: c.env.DEFAULT_SENDER || "no-reply@mail.wify.my",
      ...result.data
    };

    const message = await createEmailMessage(options);
    await c.env.EMAIL_SERVICE.send(message);

    return c.json({ success: true, message: "Email sent" });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// MCP Protocol Route
app.post("/mcp", async (c) => {
  const request = await c.req.json();
  const response = await handleMCPRequest(request, c.env);
  return c.json(response);
});

// MCP Discovery (for some clients)
app.get("/mcp", async (c) => {
  return c.json({
    mcp: true,
    name: "Cloudflare Email MCP",
    endpoints: {
      rpc: "/mcp"
    }
  });
});

export default app;
