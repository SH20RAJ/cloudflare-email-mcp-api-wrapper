# Setup Guide

This project is a Cloudflare Worker wrapper, so the normal setup is to deploy it to Cloudflare and call the Worker endpoints. You do not need to publish an npm package for standard use.

## What you need

- A Cloudflare account
- A domain on Cloudflare with Email Routing enabled
- At least one verified destination address
- Wrangler authenticated with your Cloudflare account

## 1) Enable Email Routing

Email Workers depend on Email Routing being enabled for your domain.

1. Open the Cloudflare dashboard Email Routing page: https://dash.cloudflare.com/?to=/:account/:zone/email/routing
2. Review and add the MX records Cloudflare suggests.
3. Create a custom address and set a destination address that you own.
4. Verify the destination address from the email Cloudflare sends.
5. Finish setup so the destination shows as verified.

Cloudflare docs:

- https://developers.cloudflare.com/email-routing/get-started/enable-email-routing/
- https://developers.cloudflare.com/email-routing/email-workers/
- https://developers.cloudflare.com/email-routing/email-workers/send-email-workers/
- https://developers.cloudflare.com/email-routing/email-workers/reply-email-workers/

## 2) Get your Cloudflare account ID

You only need `CLOUDFLARE_ACCOUNT_ID` for legacy scripts or other direct Cloudflare API calls.

To copy it from the dashboard:

1. Open the Cloudflare Account home page: https://dash.cloudflare.com/?to=/:account/home
2. Select the menu next to your account name.
3. Choose Copy account ID.

You can also find it in the Workers & Pages section:

1. Open the Cloudflare Workers & Pages page: https://dash.cloudflare.com/?to=/:account/workers-and-pages
2. Look for the Account details section.
3. Copy the Account ID from there.

Cloudflare reference:

- https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/

## 3) Create a Cloudflare API token

You only need `CLOUDFLARE_API_TOKEN` if you are using the legacy direct Cloudflare REST test flow or another API-based script.

Steps:

1. Open the Cloudflare API Tokens page: https://dash.cloudflare.com/profile/api-tokens/
2. Select Create Token.
3. Choose a template or create a custom token.
4. Grant only the permissions your script needs.
5. Create the token and copy the secret once. Cloudflare shows it only one time.

Cloudflare reference:

- https://developers.cloudflare.com/fundamentals/api/get-started/create-token/

## 4) Configure the Worker

The deployed Worker itself does not require `CLOUDFLARE_API_TOKEN` or `CLOUDFLARE_ACCOUNT_ID`.

Set the Worker variables and secrets you actually want the wrapper to use:

- `API_TOKEN`: protects `/send` and `/mcp`
- `DEFAULT_SENDER`: default sender address
- `DEFAULT_FROM_NAME`: optional sender display name

Example:

```bash
wrangler secret put API_TOKEN
```

## 5) Local development

Install dependencies and run the Worker locally:

```bash
npm install
npm run dev
```

If you are using the optional local test script, set the values in `.env.example` and then run:

```bash
npm run test:api
```

## 6) Deploy

Deploy the Worker to Cloudflare:

```bash
npm run deploy
```

## Legacy variables

The following variables are only for older direct Cloudflare API scripts and are not required for the Worker wrapper itself:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
