import "@testing-library/jest-dom/vitest";

// jsdom does not implement scrollIntoView at all — the property is undefined,
// so calling it throws. The session runner scrolls the exercise card into view
// on every exercise change, which would otherwise fail every test that
// navigates between exercises. Stubbed globally rather than per-suite so the
// tests that care can spy on it and the ones that don't stay untouched.
if (typeof window !== "undefined" && !window.Element.prototype.scrollIntoView) {
  window.Element.prototype.scrollIntoView = function scrollIntoView() {};
}
