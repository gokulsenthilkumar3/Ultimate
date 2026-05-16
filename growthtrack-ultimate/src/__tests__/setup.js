import '@testing-library/jest-dom';
import { vi } from 'vitest';

// ─── Canvas / WebGL mock ────────────────────────────────────────────────────
// jsdom has no real canvas. Three.js / R3F import WebGLRenderer on module load,
// so we must provide a stub before any test file runs.
class WebGLRenderingContextStub {
  enable() {}
  disable() {}
  viewport() {}
  clear() {}
  clearColor() {}
  clearDepth() {}
  depthFunc() {}
  blendFunc() {}
  blendEquation() {}
  pixelStorei() {}
  getExtension() { return null; }
  getParameter() { return 0; }
  getShaderPrecisionFormat() { return { precision: 0, rangeMin: 0, rangeMax: 0 }; }
  createShader() { return {}; }
  shaderSource() {}
  compileShader() {}
  getShaderParameter() { return true; }
  createProgram() { return {}; }
  attachShader() {}
  linkProgram() {}
  getProgramParameter() { return true; }
  useProgram() {}
  createBuffer() { return {}; }
  bindBuffer() {}
  bufferData() {}
  createVertexArray() { return {}; }
  bindVertexArray() {}
  vertexAttribPointer() {}
  enableVertexAttribArray() {}
  createTexture() { return {}; }
  bindTexture() {}
  texImage2D() {}
  texParameteri() {}
  generateMipmap() {}
  createFramebuffer() { return {}; }
  bindFramebuffer() {}
  framebufferTexture2D() {}
  deleteFramebuffer() {}
  deleteTexture() {}
  deleteBuffer() {}
  deleteProgram() {}
  deleteShader() {}
  drawArrays() {}
  drawElements() {}
  scissor() {}
  colorMask() {}
  depthMask() {}
  stencilFunc() {}
  stencilOp() {}
  isContextLost() { return false; }
  getContextAttributes() { return { antialias: false, alpha: true }; }
}

// Patch HTMLCanvasElement.getContext so it returns our stub for webgl contexts
HTMLCanvasElement.prototype.getContext = function (type) {
  if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
    return new WebGLRenderingContextStub();
  }
  if (type === '2d') {
    // Basic 2D stub
    return {
      fillRect: () => {},
      clearRect: () => {},
      getImageData: (_x, _y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: () => {},
      createImageData: () => ({ data: [] }),
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      restore: () => {},
      scale: () => {},
      rotate: () => {},
      translate: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      measureText: () => ({ width: 0 }),
      canvas: this,
    };
  }
  return null;
};

HTMLCanvasElement.prototype.toDataURL = () => '';

// ─── R3F / Three.js module mocks ────────────────────────────────────────────
// React-Three-Fiber and Drei try to access DOM features not available in jsdom.
// We mock the entire packages so component imports don't crash.
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => children,
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    camera: { position: { set: vi.fn() }, fov: 40, near: 0.1, far: 100 },
    gl: { domElement: document.createElement('canvas'), setSize: vi.fn(), render: vi.fn(), dispose: vi.fn() },
    scene: { add: vi.fn(), remove: vi.fn() },
    size: { width: 800, height: 600 },
  })),
  extend: vi.fn(),
}));

vi.mock('@react-three/drei', () => ({
  useGLTF: vi.fn(() => ({
    scene: { traverse: vi.fn(), clone: vi.fn(() => ({ traverse: vi.fn() })) },
    nodes: {},
    materials: {},
  })),
  useProgress: vi.fn(() => ({ progress: 100 })),
  OrbitControls: () => null,
  PerspectiveCamera: () => null,
  Environment: () => null,
  Reflector: () => null,
  Float: ({ children }) => children,
  Html: ({ children }) => children,
  Text: () => null,
  Preload: () => null,
  useTexture: vi.fn(() => ({})),
  MeshTransmissionMaterial: () => null,
}));

vi.mock('@react-three/postprocessing', () => ({
  EffectComposer: () => null,
  Bloom: () => null,
  ChromaticAberration: () => null,
  Vignette: () => null,
  Noise: () => null,
  ToneMapping: () => null,
  Glitch: () => null,
}));

// ─── Browser API stubs missing from jsdom ───────────────────────────────────

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver = class {
    constructor(cb) { this._cb = cb; }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (!window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

// Silence Three.js WebGL warnings — expected in jsdom environment
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  const msg = args[0]?.toString() ?? '';
  if (
    msg.includes('THREE.WebGLRenderer') ||
    msg.includes('WebGL') ||
    msg.includes('EffectComposer') ||
    msg.includes('R3F') ||
    msg.includes('useLayoutEffect')
  ) return;
  originalConsoleWarn(...args);
};
