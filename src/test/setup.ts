import '@testing-library/jest-dom';

// Mock window.matchMedia for jsdom environment (not implemented in jsdom).
// Re-applied before every test because vi.restoreAllMocks() in afterEach
// strips the mockImplementation, which would otherwise make matchMedia()
// return undefined for all but the first test in a file.
function mockMatchMedia(): void {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

mockMatchMedia();

beforeEach(() => {
  mockMatchMedia();
});

// Clean up after each test
afterEach(() => {
  vi.restoreAllMocks();
});
