// ============================================
// CanvasKit Wasm Loader
// ============================================

import CanvasKitInit from 'canvaskit-wasm';
import { FigmentRenderer } from '../renderer/canvas-renderer';

let ckInstance: Awaited<ReturnType<typeof CanvasKitInit>> | null = null;
let rendererInstance: FigmentRenderer | null = null;
let initPromise: Promise<FigmentRenderer> | null = null;

export async function initEngine(): Promise<FigmentRenderer> {
  if (rendererInstance) return rendererInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    ckInstance = await CanvasKitInit({
      locateFile: (file: string) => `/node_modules/canvaskit-wasm/bin/${file}`,
    });
    rendererInstance = new FigmentRenderer(ckInstance);
    return rendererInstance;
  })();

  return initPromise;
}

export function getRenderer(): FigmentRenderer | null {
  return rendererInstance;
}

export function getCanvasKit() {
  return ckInstance;
}
