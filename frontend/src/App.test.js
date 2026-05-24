import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  global.fetch = jest.fn(async (url) => {
    const path = String(url);
    let body = {};
    if (path.includes('/api/auth/me')) {
      return jsonResponse({ error: { message: 'Authentication required' } }, 401);
    }
    if (path.includes('/api/health')) {
      body = { status: 'ok', valkey: 'connected', search: 'unavailable', json: 'unavailable', memoryStore: true };
    } else if (path.includes('/api/categories')) {
      body = { results: [{ id: 'category:laptops', name: 'Laptops', icon: 'laptop', children: [] }] };
    } else if (path.includes('/api/products')) {
      body = {
        total: 1,
        page: 1,
        pageSize: 8,
        results: [
          {
            id: 'product:001',
            name: 'Acer Nitro V 15 Gaming Laptop',
            brand: 'Acer',
            price: 58999,
            compareAtPrice: 66079,
            rating: 4.5,
            reviewCount: 120,
            image: '/assets/images/thumbs/product-two-img1.png',
            availableStock: 15
          }
        ]
      };
    } else if (path.includes('/api/trending') || path.includes('/api/recommendations')) {
      body = { results: [] };
    }
    return jsonResponse(body);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('renders the focused storefront home page', async () => {
  render(<App />);
  expect(await screen.findAllByText(/Valkey Mart/i)).not.toHaveLength(0);
  await waitFor(() => expect(screen.getAllByText(/Acer Nitro/i).length).toBeGreaterThan(0));
});

function jsonResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  });
}
