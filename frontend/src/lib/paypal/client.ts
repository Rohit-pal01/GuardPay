// A1 owns this file. PayPal sandbox access token and request helper.
import { PaypalError } from './errors';

const SANDBOX_BASE_URL = 'https://api-m.sandbox.paypal.com';

type CachedToken = { value: string; expiresAt: number };
let cachedToken: CachedToken | null = null;

// This project only ever talks to the PayPal sandbox (practice mode).
export function getPayPalBaseUrl(): string {
  const env = process.env.PAYPAL_ENV ?? 'sandbox';
  if (env !== 'sandbox') {
    throw new PaypalError('unknown', 'PAYPAL_ENV must be "sandbox" for this project');
  }
  return SANDBOX_BASE_URL;
}

// Throws a PaypalError on any problem. It never returns null.
export async function getPayPalAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) {
    throw new PaypalError('unknown', 'Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET');
  }

  const credentials = Buffer.from(`${clientId}:${secret}`).toString('base64');
  let response: Response;
  try {
    response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      cache: 'no-store',
    });
  } catch {
    throw new PaypalError('unknown', 'Could not reach PayPal to get an access token');
  }

  if (!response.ok) {
    throw new PaypalError(
      'unknown',
      `PayPal rejected the access token request (HTTP ${response.status}). Check the Client ID and Secret.`,
    );
  }

  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token || !data.expires_in) {
    throw new PaypalError('unknown', 'PayPal returned an unexpected token response');
  }

  // Refresh one minute before PayPal says the token expires.
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.value;
}

type PayPalRequestOptions = {
  method: 'GET' | 'POST';
  body?: unknown;
  // Same id = PayPal treats a repeat as the same request, so no double charge.
  requestId?: string;
};

export async function paypalRequest(
  path: string,
  options: PayPalRequestOptions,
): Promise<Response> {
  const token = await getPayPalAccessToken();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  if (options.requestId) {
    headers['PayPal-Request-Id'] = options.requestId;
  }

  try {
    return await fetch(`${getPayPalBaseUrl()}${path}`, {
      method: options.method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: 'no-store',
    });
  } catch {
    throw new PaypalError('unknown', 'Could not reach PayPal');
  }
}
