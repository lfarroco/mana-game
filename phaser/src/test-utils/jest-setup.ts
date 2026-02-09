// Jest setup file for global mocks
import { jest } from '@jest/globals';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn<(key: string) => string | null>(),
  setItem: jest.fn<(key: string, value: string) => void>(),
  removeItem: jest.fn<(key: string) => void>(),
  clear: jest.fn<() => void>(),
  length: 0,
  key: jest.fn<(index: number) => string | null>(),
};

global.localStorage = localStorageMock;

// Mock fetch if needed
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

// Mock ResizeObserver if needed
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
})) as any;