// A1 owns this file. Phase 0 stub so A2 can map typed errors (FR-A2-29).
export type PaypalErrorCode = 'declined' | 'expired' | 'duplicate_capture' | 'unknown';
export class PaypalError extends Error {
  constructor(public code: PaypalErrorCode, message: string) { super(message); this.name = 'PaypalError'; }
}
