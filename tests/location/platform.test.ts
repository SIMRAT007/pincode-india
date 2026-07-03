import { detectRuntime, __resetRuntimeCache } from '../../src/location/platform';

describe('detectRuntime()', () => {
  const originalNavigator = (global as any).navigator;
  const originalWindow = (global as any).window;

  afterEach(() => {
    __resetRuntimeCache();
    (global as any).navigator = originalNavigator;
    (global as any).window = originalWindow;
  });

  test('detects node when no navigator/window present', () => {
    delete (global as any).navigator;
    delete (global as any).window;
    __resetRuntimeCache();

    expect(detectRuntime()).toBe('node');
  });

  test('detects react-native via navigator.product marker', () => {
    (global as any).navigator = { product: 'ReactNative' };
    delete (global as any).window;
    __resetRuntimeCache();

    expect(detectRuntime()).toBe('react-native');
  });

  test('detects browser when window.document exists and not react-native', () => {
    (global as any).navigator = { product: 'Gecko' };
    (global as any).window = { document: {} };
    __resetRuntimeCache();

    expect(detectRuntime()).toBe('browser');
  });

  test('react-native takes priority over browser-like globals', () => {
    (global as any).navigator = { product: 'ReactNative' };
    (global as any).window = { document: {} };
    __resetRuntimeCache();

    expect(detectRuntime()).toBe('react-native');
  });

  test('caches the result after first call', () => {
    delete (global as any).navigator;
    delete (global as any).window;
    __resetRuntimeCache();

    const first = detectRuntime();
    // Mutate globals after first detection — cached value should not change.
    (global as any).navigator = { product: 'ReactNative' };
    const second = detectRuntime();

    expect(first).toBe('node');
    expect(second).toBe('node');
  });
});
