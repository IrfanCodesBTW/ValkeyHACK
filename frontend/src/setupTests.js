// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

jest.mock('react-slick', () => {
  const React = require('react');
  return function MockSlider({ children }) {
    return React.createElement('div', { 'data-testid': 'mock-slider' }, children);
  };
});

jest.mock('jquery', () => {
  const api = {
    select2: jest.fn(() => api),
    data: jest.fn(() => false),
  };
  const jquery = jest.fn(() => api);
  return {
    __esModule: true,
    default: jquery,
  };
});

window.scrollTo = jest.fn();

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
