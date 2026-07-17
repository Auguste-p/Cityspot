// jsdom has no ResizeObserver; Radix primitives (RadioGroup indicator, Switch
// thumb) use it for presence/size animations. A no-op stub is enough for tests.
if (typeof globalThis.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
