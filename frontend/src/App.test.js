import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the storefront home page', async () => {
  render(<App />);
  expect(await screen.findAllByText(/Valkey/i)).not.toHaveLength(0);
});
