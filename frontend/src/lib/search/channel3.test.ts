import { afterEach, describe, expect, it, vi } from 'vitest';
import { searchChannel3 } from './channel3';

describe('Channel3 v1 search client', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('uses the current server-side v1 endpoint and maps a product offer', async () => {
    vi.stubEnv('USE_MOCKS', 'false');
    vi.stubEnv('DEMO_MODE', '');
    vi.stubEnv('CHANNEL3_API_KEY', 'test-key');
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: [{
        id: 'channel3-product-1', title: 'Live Running Shoe', description: 'Lightweight trainer',
        images: [{ url: 'https://images.example/shoe.jpg' }],
        offers: [{ domain: 'shop.example', url: 'https://shop.example/shoe', price: { price: 89.99 } }],
      }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const candidates = await searchChannel3({ query: 'running shoes', limit: 3 });

    expect(fetchMock).toHaveBeenCalledWith('https://api.trychannel3.com/v1/search', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'x-api-key': 'test-key' }),
      body: JSON.stringify({ query: 'running shoes', limit: 3 }),
    }));
    expect(candidates[0]).toMatchObject({
      id: 'channel3-product-1', price: 89.99, merchant: 'shop.example', url: 'https://shop.example/shoe',
    });
  });
});
