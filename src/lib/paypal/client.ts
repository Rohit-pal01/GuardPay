export function getPayPalBaseUrl(): string {
  const env = process.env.PAYPAL_ENV || "sandbox";
  return env === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export async function getPayPalAccessToken(): Promise<string | null> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret || clientId === "mock_paypal_client_id") {
    return null;
  }

  try {
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!res.ok) {
      console.warn(`PayPal OAuth failed with status ${res.status}`);
      return null;
    }

    const data = await res.json();
    return data.access_token || null;
  } catch (err) {
    console.warn("PayPal OAuth exception:", err);
    return null;
  }
}

