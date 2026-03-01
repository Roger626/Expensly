import { Injectable } from '@angular/core';
import { readBarcodes, prepareZXingModule } from 'zxing-wasm/reader';

/**
 * Servicio de escaneo de QR en el browser (lado del cliente).
 *
 * Pipeline por imagen:
 *   P1. Blob del archivo original (JPEG/PNG sin re-encodear)
 *   P2. Canvas completo, greyscale + contraste fuerte → ImageData
 *   P3. Canvas 50% inferior preprocesado → ImageData
 *   P4. Canvas 30% inferior preprocesado → ImageData
 *   P5. Canvas 15% inferior preprocesado (justo el área del QR) → ImageData
 *   P6. Canvas 15% inferior invertido → ImageData  (QR blanco s/ fondo negro)
 *
 * El WASM se precarga en el constructor para que el primer scan sea inmediato.
 */
@Injectable({ providedIn: 'root' })
export class QrScannerService {

  /**
   * Promise que resuelve cuando el WASM está completamente cargado y listo.
   * Se await antes del primer scan para garantizar que ZXing no falle.
   */
  private readonly wasmReady: Promise<unknown>;

  constructor() {
    // fireImmediately: true → empieza a cargar el WASM en el constructor,
    // no en el primer scan.  De esta forma cuando el usuario sube la imagen
    // el WASM ya está en memoria y no hay latencia extra.
    this.wasmReady = prepareZXingModule({
      overrides: {
        // Ruta absoluta desde la raíz del servidor → funciona en cualquier subruta
        locateFile: (p: string) => p.endsWith('.wasm') ? `/assets/${p}` : p,
      },
      fireImmediately: true,
    }).catch(e => console.error('[QrScanner] WASM load error:', e));
  }

  /**
   * Escanea cada archivo en orden y devuelve el texto del primer QR encontrado.
   * Escaneamos en orden inverso si hay múltiples fotos porque el QR suele estar
   * al final del ticket (última imagen).
   */
  async scanFiles(files: File[]): Promise<string | null> {
    // Invertir para priorizar la última imagen (donde suele estar el QR del ticket)
    const ordered = files.length > 1 ? [...files].reverse() : files;

    for (const file of ordered) {
      const result = await this.scanFile(file);
      if (result) return result;
    }
    return null;
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async scanFile(file: File): Promise<string | null> {
    // ── P0: intento con BarcodeDetector nativo (Chrome/Edge) ─────────────────
    const native = await this.nativeScan(file);
    if (native) { console.log('[QrScanner] QR en P0 (BarcodeDetector nativo)'); return native; }

    // ── P1: archivo original como Blob (sin pérdida de calidad) ──────────────
    await this.wasmReady;
    const r1 = await this.zxingScan(file);
    if (r1) { console.log('[QrScanner] QR en P1 (original ZXing)'); return r1; }

    // ── Cargar imagen en canvas para preprocessing con Canvas API ─────────────
    const { canvas, ctx } = await this.loadToCanvas(file, 2000);
    const W = canvas.width;
    const H = canvas.height;

    // ── P2: imagen completa preprocesada ──────────────────────────────────────
    const fullData = this.extractRegion(ctx, 0, 0, W, H);
    const r2 = await this.zxingScan(fullData);
    if (r2) { console.log('[QrScanner] QR en P2 (completa preprocesada)'); return r2; }

    // ── P3–P5: recortes de la zona inferior ───────────────────────────────────
    const regions: Array<{ yFrac: number; label: string }> = [
      { yFrac: 0.50, label: '50% inf' },
      { yFrac: 0.70, label: '30% inf' },
      { yFrac: 0.85, label: '15% inf' },
    ];

    for (const { yFrac, label } of regions) {
      const cropY = Math.floor(H * yFrac);
      const cropH = H - cropY;
      const region = this.extractRegion(ctx, 0, cropY, W, cropH);
      const rx = await this.zxingScan(region);
      if (rx) { console.log(`[QrScanner] QR en ${label}`); return rx; }
    }

    // ── P6: 15% inferior invertido (QR claro sobre fondo oscuro) ─────────────
    const cropY6 = Math.floor(H * 0.85);
    const inverted = this.extractRegion(ctx, 0, cropY6, W, H - cropY6, true);
    const r6 = await this.zxingScan(inverted);
    if (r6) { console.log('[QrScanner] QR en P6 (invertido)'); return r6; }

    // ── P7: recorte cuadrado centrado en el pie (zona QR) con binarización dura ─
    const size = Math.min(W, Math.max(Math.floor(H * 0.45), 500));
    const cx = Math.max(0, Math.floor((W - size) / 2));
    const cy = Math.max(0, H - size);
    const focused = this.extractRegion(ctx, cx, cy, size, size, false);
    const binarized = this.binarize(focused, 140);
    const r7 = await this.zxingScan(binarized);
    if (r7) { console.log('[QrScanner] QR en P7 (cuadrado binarizado)'); return r7; }

    return null;
  }

  /**
   * Extrae una región del canvas con preprocessing:
   * - Greyscale (elimina ruido de color que confunde la binarización de ZXing)
   * - Contraste fuerte (Canvas filter: contrast(180%) brightness(110%))
   * - Opción de invertir para QR claros sobre fondo oscuro
   *
   * Devuelve un ImageData ya procesado que readBarcodes acepta directamente.
   */
  private extractRegion(
    srcCtx: CanvasRenderingContext2D,
    sx: number, sy: number, sw: number, sh: number,
    invert = false,
  ): ImageData {
    const offscreen = document.createElement('canvas');
    offscreen.width  = sw;
    offscreen.height = sh;
    const ctx = offscreen.getContext('2d')!;

    // Aplicar filtros antes de dibujar (Canvas filter es GPU-accelerated)
    ctx.filter = invert
      ? 'grayscale(1) contrast(180%) brightness(110%) invert(1)'
      : 'grayscale(1) contrast(180%) brightness(110%)';

    ctx.drawImage(
      srcCtx.canvas,
      sx, sy, sw, sh,   // fuente
      0,  0,  sw, sh,   // destino
    );

    return ctx.getImageData(0, 0, sw, sh);
  }

  /**
   * Llama a readBarcodes. Acepta Blob (archivo) o ImageData (pixels del canvas).
   * tryHarder + tryRotate + tryInvert activan todos los modos de ZXing C++ para
   * fotos reales de tickets (perspectiva, blur, rotación).
   */
  private async zxingScan(input: Blob | ImageData): Promise<string | null> {
    try {
      const results = await readBarcodes(input as Blob, {
        formats: ['QRCode'],
        tryHarder: true,
        tryRotate: true,
        tryInvert: true,
      });
      const text = results?.[0]?.text?.trim() ?? null;
      return text && text.length > 5 ? text : null;
    } catch {
      return null;
    }
  }

  /** Usa BarcodeDetector nativo si está disponible (más rápido que WASM). */
  private async nativeScan(file: Blob): Promise<string | null> {
    const hasNative = typeof (globalThis as any).BarcodeDetector !== 'undefined';
    if (!hasNative) return null;
    try {
      const detector = new (globalThis as any).BarcodeDetector({ formats: ['qr_code'] });
      const bitmap = await createImageBitmap(file);
      const results = await detector.detect(bitmap);
      bitmap.close?.();
      const txt = results?.[0]?.rawValue?.trim() ?? null;
      return txt && txt.length > 5 ? txt : null;
    } catch {
      return null;
    }
  }

  /** Binariza ImageData con umbral fijo (mitiga reflejos y sombras). */
  private binarize(img: ImageData, threshold = 140): ImageData {
    const data = new Uint8ClampedArray(img.data);
    for (let i = 0; i < data.length; i += 4) {
      const v = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const val = v > threshold ? 255 : 0;
      data[i] = data[i + 1] = data[i + 2] = val;
    }
    return new ImageData(data, img.width, img.height);
  }

  /**
   * Carga un File en un <canvas> con downscale si supera maxPx.
   * Canvas API usa la GPU del cliente — es ~10× más rápido que Jimp en el browser.
   */
  private loadToCanvas(file: File, maxPx: number): Promise<{
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
  }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale  = Math.min(1, maxPx / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ canvas, ctx });
      };

      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load error')); };
      img.src = url;
    });
  }
}
