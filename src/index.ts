import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

export interface Env {
  EMAIL_SERVICE: any; // Type 'SendEmail' is available via @cloudflare/workers-types
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const recipient = url.searchParams.get("to") || "shaswatraj3@gmail.com";
    const sender = "test@mail.wify.my";

    const msg = createMimeMessage();
    msg.setSender({ name: "Email Test Worker", addr: sender });
    msg.setRecipient(recipient);
    msg.setSubject("Test Email from Cloudflare Worker");
    msg.addMessage({
      contentType: "text/plain",
      data: "This email was sent using the Cloudflare Worker binding for the new Email Service.",
    });

    const message = new EmailMessage(
      sender,
      recipient,
      msg.asRaw()
    );

    try {
      await env.EMAIL_SERVICE.send(message);
      return new Response(`Email sent to ${recipient} successfully!`);
    } catch (e: any) {
      return new Response(`Failed to send email: ${e.message}`, { status: 500 });
    }
  },
};
