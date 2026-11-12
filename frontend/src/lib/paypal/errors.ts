// A1 owns this file. Typed PayPal errors so the executor can tell failures apart.

export type PaypalErrorCode = 'declined' | 'expired' | 'duplicate_capture' | 'unknown';

export class PaypalError extends Error {
  readonly code: PaypalErrorCode;

  constructor(code: PaypalErrorCode, message: string) {
    super(message);
    this.name = 'PaypalError';
    this.code = code;
  }
}

// Issue names taken from PayPal's Orders v2 error documentation.
const DECLINED_ISSUES = new Set([
  'INSTRUMENT_DECLINED',
  'PAYER_ACTION_REQUIRED',
  'ORDER_NOT_APPROVED',
  'CARD_EXPIRED',
]);

// Turns a failed PayPal response into a PaypalError.
// Only the HTTP status and PayPal's own issue names go into the message:
// never the request body, the token or any key.
export async function paypalErrorFromResponse(
  res: Response,
  action: string,
): Promise<PaypalError> {
  let name = '';
  let issues: string[] = [];
  try {
    const body = (await res.json()) as {
      name?: string;
      details?: Array<{ issue?: string }>;
    };
    name = body.name ?? '';
    issues = (body.details ?? []).map((d) => d.issue ?? '').filter(Boolean);
  } catch {
    // The response was not JSON. The status code is still enough.
  }

  const reason = issues.length > 0 ? issues.join(', ') : name;
  const summary = `PayPal could not ${action} (HTTP ${res.status}${reason ? `, ${reason}` : ''})`;

  if (issues.includes('ORDER_ALREADY_CAPTURED')) {
    return new PaypalError('duplicate_capture', summary);
  }
  if (issues.some((issue) => DECLINED_ISSUES.has(issue))) {
    return new PaypalError('declined', summary);
  }
  if (res.status === 404) {
    return new PaypalError('expired', `${summary}: order not found or expired`);
  }
  return new PaypalError('unknown', summary);
}
