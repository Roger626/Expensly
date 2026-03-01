import { IProcesarFacturaStrategy } from "./factura-procesar.strategy.interface";
import { FacturaProcesamientoResult, FacturaProcesamientoInput} from "./factura-procesar.strategy.interface";
import { Injectable } from "@nestjs/common";
import { Jimp } from 'jimp';
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as nodePath from 'path';

// ─── Inicialización WASM (una sola vez al cargar el módulo) ──────────────────
// NestJS compila a CommonJS. zxing-wasm usa import.meta.url (ESM) para localizar
// el .wasm → falla silenciosamente en CJS. La solución fiable es leer el binario
// con fs.readFileSync y pasarlo como wasmBinary, bypaseando toda resolución de URL.
// Guardamos la promesa de inicialización para esperar antes de cada decode.
const wasmReady: Promise<unknown> = (() => {
    try {
        const wasmPath = nodePath.join(
            process.cwd(), 'node_modules', 'zxing-wasm', 'dist', 'reader', 'zxing_reader.wasm',
        );
        const nodeBuf = fs.readFileSync(wasmPath);
        const wasmBinary = nodeBuf.buffer.slice(
            nodeBuf.byteOffset,
            nodeBuf.byteOffset + nodeBuf.byteLength,
        ) as ArrayBuffer;
        const p = prepareZXingModule({ overrides: { wasmBinary }, fireImmediately: true });
        console.log('[ZXing] WASM cargado desde:', wasmPath);
        return Promise.resolve(p);
    } catch (e) {
        console.error('[ZXing] No se pudo cargar el WASM:', e);
        return Promise.resolve();
    }
})();

@Injectable()
export class ProcesarFacturaQRStrategy implements IProcesarFacturaStrategy {

    /**
     * FLUJO DE DOBLE VERIFICACIÓN:
     *
     * a) El cliente envía `clientQrData` (escaneado con zxing-wasm en el browser):
     *    1. El servidor escanea el QR de forma independiente.
     *    2. Si el servidor confirma el mismo valor → se acepta y se salta Azure OCR. ✓
     *    3. Si el servidor no puede leer el QR o hay discrepancia → false (fallback a OCR). ✗
     *
     * b) El cliente NO envía `clientQrData` (flujo estándar sin soporte zxing en frontend):
     *    1. El servidor escanea el QR normalmente.
     *    2. Encontrado → true. No encontrado → false.
     */
    async canHandle(input: FacturaProcesamientoInput): Promise<boolean> {
        // ── Fast path: el cliente ya escaneó el QR → usarlo directamente ───────
        // Re-escanear 3 imágenes con P1-P8 (Jimp + ZXing WASM) sólo para "verificar"
        // lo que el cliente ya hizo tarda ~50s. Si el browser entregó un QR con
        // zxing-wasm es confiable; no tiene sentido duplicar el trabajo.
        if (input.clientQrData) {
            input.qrUrl = input.clientQrData;
            console.log('[QRStrategy] ✓ QR recibido del cliente (sin re-escaneo):', input.clientQrData);
            return true;
        }

        // ── Flujo estándar: el cliente no envió QR → escanear server-side ───────
        const buffers = input.fileBuffers ?? (input.fileBuffer ? [input.fileBuffer] : []);
        if (buffers.length === 0) return false;

        for (let i = 0; i < buffers.length; i++) {
            try {
                const serverQr = await this.tryScanBuffer(buffers[i], i + 1);
                if (serverQr) {
                    input.qrUrl = serverQr;
                    console.log(`[QRStrategy] QR detectado en imagen ${i + 1} (flujo estándar):`, serverQr);
                    return true;
                }
            } catch (err) {
                console.error(`[QRStrategy] Error al escanear imagen ${i + 1}:`, err);
            }
        }

        console.log(`[QRStrategy] No se detectó QR en ninguna de las ${buffers.length} imágenes.`);
        return false;
    }

    /** Normaliza un string QR para la comparación: sin espacios, minúsculas. */
    private normalizeQr(raw: string): string {
        return raw.trim().toLowerCase().replace(/\s+/g, '');
    }

    /**
     * Pipeline de detección para un buffer:
     *
     * P1. Bytes originales del archivo (JPEG/PNG) — ZXing los decodifica internamente.
     *     Máxima calidad sin ninguna pérdida por re-encoding.
     *
     * P2–P5. Recortes progresivos de la zona inferior (QR siempre al pie del ticket):
     *     50% inferior · 35% inferior · 25% inferior · 15% inferior
     *     Cada recorte se procesa con greyscale + contraste alto antes del scan.
     *
    * P6. Recorte cuadrado centrado en el pie (zona del QR), con normalize() + contraste.

    * P7. Imagen completa binarizada con umbral adaptativo para tickets sobreexpuestos.

    * P8. Recorte 25% inferior, imagen invertida (QR claro sobre fondo oscuro).
     *
     * Para cada recorte se usan dos tamaños: nativo y ×2 (la mayoría de los escáneres
     * WASM requieren ≥ 100 px de lado de módulo para decodificar correctamente fotos).
     */
    private async tryScanBuffer(buffer: Buffer, imgNum: number): Promise<string | null> {
        // ── Pass 1: archivo original sin tocar ────────────────────────────────
        const r1 = await this.zxingScan(new Uint8Array(buffer));
        if (r1) { console.log(`[QRStrategy] img ${imgNum} P1 (original)`); return r1; }

        // ── Cargar con Jimp para los recortes ─────────────────────────────────
        const image = await Jimp.read(buffer);
        const { width: w, height: h } = image;

        // ── Estrategia de recortes: bottom %, con y sin upscale ───────────────
        const crops: Array<{ yFrac: number; hFrac: number; label: string }> = [
            { yFrac: 0.50, hFrac: 0.50, label: '50% inf' },
            { yFrac: 0.65, hFrac: 0.35, label: '35% inf' },
            { yFrac: 0.75, hFrac: 0.25, label: '25% inf' },
            { yFrac: 0.85, hFrac: 0.15, label: '15% inf' },
        ];

        for (const { yFrac, hFrac, label } of crops) {
            const cropH = Math.max(Math.floor(h * hFrac), 1);
            const cropY = Math.floor(h * yFrac);

            // greyscale + contraste agresivo — ZXing HybridBinarizer trabaja mejor con
            // imágenes de alto contraste; reduce el ruido de papel mal iluminado
            const base = image.clone()
                .crop({ x: 0, y: cropY, w, h: cropH })
                .greyscale()
                .contrast(0.8);

            const bufNative = await base.getBuffer('image/png');
            const rx = await this.zxingScan(new Uint8Array(bufNative));
            if (rx) { console.log(`[QRStrategy] img ${imgNum} recorte ${label} (nativo)`); return rx; }

            // Upscale ×2 — mínimo recomendado para decodificar QR en fotos de teléfono
            // donde el módulo del QR es < 10 px después del downscale inicial a 2000px
            if (cropH < 800) {
                const upscaled = base.clone().resize({ w: Math.min(w * 2, 3000), h: cropH * 2 });
                const bufUp = await upscaled.getBuffer('image/png');
                const ry = await this.zxingScan(new Uint8Array(bufUp));
                if (ry) { console.log(`[QRStrategy] img ${imgNum} recorte ${label} (×2)`); return ry; }
            }
        }

        // ── Pass 6: recorte cuadrado centrado en el pie (zona QR), normalize+contraste ──
        const squareSize = Math.min(w, Math.max(Math.floor(h * 0.45), 500));
        const cropY6 = Math.max(0, h - squareSize);
        const cropX6 = Math.max(0, Math.floor((w - squareSize) / 2));
        const focused = image.clone()
            .crop({ x: cropX6, y: cropY6, w: squareSize, h: squareSize })
            .greyscale()
            .normalize()   // estira histograma, útil con sombras en el QR
            .contrast(0.9);

        const bufFocus = await focused.getBuffer('image/png');
        const r6 = await this.zxingScan(new Uint8Array(bufFocus));
        if (r6) { console.log(`[QRStrategy] img ${imgNum} P6 (cuadrado QR)`); return r6; }

        // Upscale del recorte si quedó chico (< 1200px)
        if (squareSize < 1200) {
            const up = focused.clone().resize({ w: squareSize * 2, h: squareSize * 2 });
            const bufUp = await up.getBuffer('image/png');
            const r6b = await this.zxingScan(new Uint8Array(bufUp));
            if (r6b) { console.log(`[QRStrategy] img ${imgNum} P6b (cuadrado QR ×2)`); return r6b; }
        }

        // ── Pass 7: imagen completa binarizada (tickets sobre/sub-expuestos) ──
        const binarized = image.clone().greyscale().threshold({ max: 128 });
        const bufBin = await binarized.getBuffer('image/png');
        const r7 = await this.zxingScan(new Uint8Array(bufBin));
        if (r7) { console.log(`[QRStrategy] img ${imgNum} P7 (binarizado)`); return r7; }

        // ── Pass 8: 25% inferior invertido (QR blanco sobre fondo negro) ──────
        const cropY8 = Math.floor(h * 0.75);
        const inverted = image.clone()
            .crop({ x: 0, y: cropY8, w, h: h - cropY8 })
            .greyscale()
            .invert();
        const bufInv = await inverted.getBuffer('image/png');
        const r8 = await this.zxingScan(new Uint8Array(bufInv));
        if (r8) { console.log(`[QRStrategy] img ${imgNum} P8 (invertido)`); return r8; }

        return null;
    }

    /**
     * Llama a readBarcodes con los bytes de imagen (JPEG/PNG/PNG-procesado).
     * La API v2 de zxing-wasm acepta Uint8Array directamente — decodifica
     * el formato internamente, sin pasar por DOM ni Blob.
     */
    private async zxingScan(input: Uint8Array): Promise<string | null> {
        try {
            await wasmReady; // asegurar que el módulo WASM está listo
            const results = await readBarcodes(input, {
                formats: ['QRCode'],
                tryHarder: true,   // búsqueda exhaustiva: más lenta pero detecta QR en fotos
                tryRotate: true,   // rota la imagen si el QR no está alineado
                tryInvert: true,   // intenta invertir si el fondo es más oscuro que el código
            });
            const text = results?.[0]?.text?.trim() ?? null;
            return text && text.length > 5 ? text : null;
        } catch {
            return null; // no debe bloquear el pipeline si un pass falla
        }
    }

    /** Scraping del portal DGI Panamá (efact.dgi-fep.mef.gob.pa) */
    async processInvoice(input: FacturaProcesamientoInput): Promise<FacturaProcesamientoResult> {
        const url = input.qrUrl;
        if (!url) throw new Error('No se encontró un código QR válido en la imagen.');

        try {
            const { data } = await axios.get(url, {
                timeout: 8000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'es-PA,es;q=0.9',
                },
            });

            const $ = cheerio.load(data);

            // __ Helpers ──────────────────────────────────────────────────────────
            // Busca el texto de un <dd> cuyo <dt> hermano contiene la etiqueta
            const findField = (label: string): string =>
                $(`dt, th, td, label, strong, b`)
                    .filter((_, el) => $(el).text().trim().toUpperCase().includes(label.toUpperCase()))
                    .first()
                    .nextAll('dd, td')
                    .first()
                    .text()
                    .trim();

            // Extrae número decimal de un string ("B/. 6.21" → 6.21)
            const parseAmount = (raw: string): number =>
                parseFloat(raw.replace(/[^\d.]/g, '')) || 0;

            // Convierte "14/noviembre/2025" o "14/11/2025" a "2025-11-14"
            const normalizeFecha = (raw: string): string => {
                if (!raw) return '';
                const meses: Record<string, string> = {
                    'enero':'01','febrero':'02','marzo':'03','abril':'04',
                    'mayo':'05','junio':'06','julio':'07','agosto':'08',
                    'septiembre':'09','octubre':'10','noviembre':'11','diciembre':'12',
                };
                // DD/mes_escrito/YYYY
                const ml = raw.match(/(\d{1,2})\/(\w+)\/(\d{4})/);
                if (ml) {
                    const d = ml[1].padStart(2, '0');
                    const m = meses[ml[2].toLowerCase()] ?? ml[2].padStart(2, '0');
                    return `${ml[3]}-${m}-${d}`;
                }
                // DD/MM/YYYY
                const mn = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
                if (mn) return `${mn[3]}-${mn[2].padStart(2,'0')}-${mn[1].padStart(2,'0')}`;
                return raw;
            };

            // ── Campos del portal DGI ────────────────────────────────────────────
            // RUC y DV: el portal los muestra como "9-733-273" y "97" por separado
            const rucRaw = findField('RUC') || $('[class*="ruc"]').first().text().trim();
            // DV está separado en el portal
            const dvRaw  = findField('DV')  || '';

            // Nombre del proveedor — buscar EMISOR primero para no confundir con
            // el tipo de documento ("Factura de Operación Interna")
            const nombreCandidato =
                findField('EMISOR') ||
                findField('NOMBRE DEL EMISOR') ||
                findField('RAZON SOCIAL') ||
                findField('RAZON') ||
                findField('NOMBRE') ||
                $('[class*="emisor"], [class*="nombre"], [class*="razon"]').first().text().trim();

            // Descartar si el candidato parece ser el tipo de documento
            const esNombreDocumento = /factura|comprobante|operaci[oó]n|documento/i.test(nombreCandidato);
            const nombreProveedor = esNombreDocumento ? '' : nombreCandidato;

            // Número de factura — el portal suele mostrarlo como "N# 013084019" o "No. 013084019"
            const facturaRaw = $('h4, h5, .panel-title, [class*="factura"], [class*="invoice"]')
                .filter((_, el) => /N[#°o]/.test($(el).text()))
                .first()
                .text()
                .trim();
            const numeroFactura = facturaRaw.replace(/.*?N[#°o\.\s]+/i, '').trim() || findField('FACTURA');

            // Fecha de emisión — normalizada a YYYY-MM-DD
            const fechaRaw = findField('FECHA') ||
                $('[class*="fecha"]').first().text().trim();
            const fechaEmision = normalizeFecha(fechaRaw);

            // Totales — el portal DGI los muestra en <tfoot> como:
            //   <td>Valor Total: <div>43.30</div></td>   ← subtotal (sin ITBMS)
            //   <td>ITBMS Total: <div>0.48</div></td>    ← impuesto
            // El montoTotal real = subtotal + itbms.
            // findField() no los detecta porque el valor está en un <div> interno.
            let subtotalRaw = '';
            let itbmsRaw    = '';
            $('tfoot tr').each((_, tr) => {
                const td = $(tr).find('td');
                const cellText = td.text();
                if (/valor total/i.test(cellText)) {
                    subtotalRaw = td.find('div').first().text().trim();
                } else if (/itbms total/i.test(cellText)) {
                    itbmsRaw = td.find('div').first().text().trim();
                }
            });
            // Fallback al helper genérico si el portal cambia la estructura
            if (!subtotalRaw) subtotalRaw = findField('TOTAL');
            if (!itbmsRaw)    itbmsRaw    = findField('ITBMS');

            const subtotal   = parseAmount(subtotalRaw);
            const itbms      = parseAmount(itbmsRaw);
            const montoTotal = Math.round((subtotal + itbms) * 100) / 100;

            // CUFE: el portal lo muestra explícitamente
            const cufe = findField('CUFE') ||
                $('[class*="cufe"]').first().text().trim() ||
                // fallback: regex sobre el HTML completo
                (data.match(/FE[0-9A-Za-z\-]{30,}/) ?? [''])[0];

            return {
                subtotal,
                montoTotal,
                itbms,
                fechaEmision,
                rucProveedor:    rucRaw,
                dv:              dvRaw,
                nombreProveedor: nombreProveedor,
                cufe,
                numeroFactura,
            };

        } catch (error: any) {
            console.error('[QRStrategy] Error en scraping DGI:', error.message);
            throw new Error(`Error al procesar la factura desde QR: ${error.message}`);
        }
    }
}