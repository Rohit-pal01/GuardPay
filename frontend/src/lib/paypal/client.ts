// A1 owns this file. PayPal sandbox access token (OAuth client credentials).

const SANDBOX_BASE_URL = 'https://api-m.sandbox.paypal.com';

type CachedToken = { value: string; expiresAt: number };
let cachedToken: CachedToken | null = null;

// This project only ever talks to the PayPal sandbox (practice mode).
export function getPaypalBaseUrl(): string {
  const env = process.env.PAYPAL_ENV ?? 'sandbox';
  if (env !== 'sandbox') {
    throw new Error('PAYPAL_ENV must be "sandbox" for this project');
  }
  return SANDBOX_BASE_URL;
}

export async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(`${getPaypalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`PayPal token request failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  // Refresh one minute before PayPal says the token expires.
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}
