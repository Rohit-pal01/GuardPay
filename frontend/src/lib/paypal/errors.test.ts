import { describe, expect, it } from 'vitest';
import { paypalErrorFromResponse } from './errors';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('paypalErrorFromResponse', () => {
  it('maps ORDER_ALREADY_CAPTURED to duplicate_capture', async () => {
    const err = await paypalErrorFromResponse(
      jsonResponse(422, {
        name: 'UNPROCESSABLE_ENTITY',
        details: [{ issue: 'ORDER_ALREADY_CAPTURED' }],
      }),
      'capture the payment',
    );
    expect(err.code).toBe('duplicate_capture');
  });

  it('maps INSTRUMENT_DECLINED to declined', async () => {
    const err = await paypalErrorFromResponse(
      jsonResponse(422, { details: [{ issue: 'INSTRUMENT_DECLINED' }] }),
      'capture the payment',
    );
    expect(err.code).toBe('declined');
  });

  it('maps a missing order (404) to expired', async () => {
    const err = await paypalErrorFromResponse(
      jsonResponse(404, { name: 'RESOURCE_NOT_FOUND' }),
      'capture the payment',
    );
    expect(err.code).toBe('expired');
  });

  it('maps anything else to unknown and keeps the message short', async () => {
    const err = await paypalErrorFromResponse(
      new Response('not json', { status: 500 }),
      'create the order',
    );
    expect(err.code).toBe('unknown');
    expect(err.message).toContain('HTTP 500');
  });
});
