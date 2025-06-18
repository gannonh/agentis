import { beforeEach, afterEach, vi } from 'vitest';

/* This file is automatically executed before running tests
 * Vitest setup for React components and utilities
 */

// Add regenerator runtime for async/await support in older dependencies
import 'regenerator-runtime/runtime';

// Testing library DOM extensions
import '@testing-library/jest-dom';

// Mock canvas for 'react-lottie' compatibility with Vitest
// Create a manual canvas mock since jest-canvas-mock expects Jest globals
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({ data: [] })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({ data: [] })),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
  })),
});

Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
  value: vi.fn(() => ''),
});

// Mock window.matchMedia for components that use media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Suppress console.log, console.warn, console.error during tests to reduce noise
// Only show console output if needed for debugging specific tests
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  vi.clearAllMocks();
  
  // Suppress console output during tests unless DEBUG_TESTS is set
  if (!process.env.DEBUG_TESTS) {
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  }
});

// Restore console output after tests if suppressed
afterEach(() => {
  if (!process.env.DEBUG_TESTS) {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  }
});

vi.mock('react-i18next', () => {
  const actual = vi.importActual('react-i18next');
  return {
    ...actual,
    useTranslation: () => {
      return {
        t: (key: string, options?: any) => key, // Just return the key as fallback
        i18n: {
          changeLanguage: vi.fn(),
          language: 'en',
        },
      };
    },
    initReactI18next: {
      type: '3rdParty',
      init: vi.fn(),
    },
  };
});