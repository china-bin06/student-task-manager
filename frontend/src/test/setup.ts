import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
afterEach(() => cleanup());
// jsdom 不实现原生 dialog；真实浏览器核验另行进行。
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute('open', '');
};
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute('open');
};
afterEach(() => {
  sessionStorage.clear();
  vi.unstubAllGlobals();
});
