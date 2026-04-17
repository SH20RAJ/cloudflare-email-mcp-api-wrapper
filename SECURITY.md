# Security Policy

## Supported versions

This project currently supports the latest main branch.

## Reporting vulnerabilities

Please do not open public issues for security vulnerabilities.

Share details privately with maintainers, including:

- Vulnerability description
- Impact
- Reproduction steps
- Suggested mitigation (if available)

## Security hardening recommendations

- Set `API_TOKEN` and require auth on `/send` and `/mcp`.
- Restrict destinations via `allowed_destination_addresses` in `wrangler.jsonc`.
- Prefer dedicated sender addresses.
- Rotate secrets periodically.
- Avoid storing sensitive email content in logs.
