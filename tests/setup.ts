/**
 * Jest setup file
 * Runs before all tests
 */

// Set test timeout
jest.setTimeout(30000);

// Suppress console logs during tests (unless test fails)
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  if (process.env.VERBOSE_TESTS !== 'true') {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Load environment variables for integration tests
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
