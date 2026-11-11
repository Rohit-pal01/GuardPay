// A1 owns this folder. Phase 0 MOCK with the agreed signatures so A2 can build against it.
import type { Cart, PaymentOrder } from '../../contracts';
import { PaypalError } from './errors';

export interface PaypalClient {
  createOrder(cart: Cart): Promise<PaymentOrder>;
  getOrder(paypalOrderId: string): Promise<PaymentOrder>;
  captureOrder(paypalOrderId: string): Promise<PaymentOrder>;
}
export { PaypalError };

const orders = new Map<string, PaymentOrder>();
let n = 0;
export const paypal: PaypalClient = {
  async createOrder(cart) {
    const cents = cart.items.reduce((s, i) => s + Math.round(i.unitPrice * 100) * i.quantity, 0);
    const o: PaymentOrder = { paypalOrderId: `MOCK-${++n}`, cartId: cart.id, amount: cents / 100, currency: 'USD', status: 'created' };
    orders.set(o.paypalOrderId, o);
    return o;
  },
  async getOrder(id) {
    const o = orders.get(id);
    if (!o) throw new PaypalError('unknown', `Order ${id} not found`);
    return { ...o };
  },
  async captureOrder(id) {
    const o = orders.get(id);
    if (!o) throw new PaypalError('unknown', `Order ${id} not found`);
    if (o.status === 'captured') throw new PaypalError('duplicate_capture', 'Order already captured');
    const done: PaymentOrder = { ...o, status: 'captured', captureId: `CAP-${id}` };
    orders.set(id, done);
    return { ...done };
  },
};
export const { createOrder, getOrder, captureOrder } = paypal;
