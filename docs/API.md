# API Reference

Base URL:

- `https://<your-worker>.workers.dev`

Authentication:

- If `API_TOKEN` is configured, include either:
  - `Authorization: Bearer <token>`
  - `X-API-Key: <token>`

## GET /health

Returns status.

Response:

```json
{
  "ok": true,
  "service": "cf-email-mcp-api",
  "date": "2026-04-17T00:00:00.000Z"
}
```

## GET /openapi.json

Returns OpenAPI 3.1 schema.

## POST /send

Send an email using the configured `EMAIL_SERVICE` binding.

Supported optional fields include `from`, `fromName`, `cc`, `bcc`, `replyTo`, `headers`, and `attachments`.

### Request body

```json
{
  "to": ["person@example.com"],
  "from": "noreply@yourdomain.com",
  "fromName": "Alerts",
  "cc": ["team@example.com"],
  "bcc": ["audit@example.com"],
  "replyTo": ["support@yourdomain.com"],
  "subject": "Incident opened",
  "text": "Plain text body",
  "html": "<p>HTML body</p>",
  "headers": {
    "X-Tenant-ID": "acme"
  },
  "attachments": [
    {
      "filename": "report.txt",
      "contentType": "text/plain",
      "data": "SGVsbG8gd29ybGQ=",
      "inline": false,
      "headers": {
        "X-Attachment-Meta": "v1"
      }
    }
  ]
}
```

### Validation rules

- `to`: required, string or string[]
- `subject`: required
- At least one of `text` or `html` is required
- Attachment items require `filename` and base64 `data`

### Optional fields reference

- `from`: Override sender address (must still follow Cloudflare/domain restrictions)
- `fromName`: Display name for sender
- `cc`: String or array of addresses
- `bcc`: String or array of addresses
- `replyTo`: String or array of addresses
- `headers`: Custom mail headers
- `attachments`: Array of base64 file payloads

### Example with all optional fields

```json
{
  "to": ["person@example.com"],
  "from": "noreply@yourdomain.com",
  "fromName": "Cloudflare Notifications",
  "cc": ["ops@example.com"],
  "bcc": ["audit@example.com"],
  "replyTo": ["support@yourdomain.com"],
  "subject": "Nightly report",
  "text": "Please find the report attached.",
  "headers": {
    "X-Trace-ID": "report-2026-04-17"
  },
  "attachments": [
    {
      "filename": "report.csv",
      "contentType": "text/csv",
      "data": "Y29sMSxjb2wyXG4xLDI="
    }
  ]
}
```

### Response

```json
{
  "ok": true,
  "total": 1,
  "delivered": 1,
  "failed": 0,
  "results": [
    {
      "recipient": "person@example.com",
      "ok": true
    }
  ]
}
```

## Legacy compatibility route

### GET /?to=<email>

Kept for compatibility with your original testing flow.

## CORS

Enabled for all routes:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key`
