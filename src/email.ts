import { EmailMessage } from "cloudflare:email";
import { createMimeMessage } from "mimetext";

export interface Attachment {
  name: string;
  type: string;
  data: string; // Base64
}

export interface EmailOptions {
  from: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Attachment[];
}

/**
 * Builds a MIME message and returns a Cloudflare EmailMessage
 */
export async function createEmailMessage(options: EmailOptions): Promise<EmailMessage> {
  const msg = createMimeMessage();
  
  msg.setSender(options.from);
  
  // Handle recipients
  const toList = Array.isArray(options.to) ? options.to : [options.to];
  toList.forEach(addr => msg.setRecipient(addr));
  
  if (options.cc) {
    const ccList = Array.isArray(options.cc) ? options.cc : [options.cc];
    ccList.forEach(addr => msg.addRecipient(addr, { type: 'cc' }));
  }
  
  if (options.bcc) {
    const bccList = Array.isArray(options.bcc) ? options.bcc : [options.bcc];
    bccList.forEach(addr => msg.addRecipient(addr, { type: 'bcc' }));
  }
  
  msg.setSubject(options.subject);
  
  if (options.text) {
    msg.addMessage({
      contentType: 'text/plain',
      data: options.text
    });
  }
  
  if (options.html) {
    msg.addMessage({
      contentType: 'text/html',
      data: options.html
    });
  }
  
  // Handle attachments
  if (options.attachments) {
    options.attachments.forEach(att => {
      msg.addAttachment({
        filename: att.name,
        contentType: att.type,
        data: att.data
      });
    });
  }
  
  // Primary recipient for the EmailMessage constructor
  const primaryTo = toList[0];
  
  return new EmailMessage(
    options.from,
    primaryTo,
    msg.asRaw()
  );
}
