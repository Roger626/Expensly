import { Injectable } from '@nestjs/common';
import { DocumentAnalysisClient, AzureKeyCredential } from "@azure/ai-form-recognizer";
import { ProcessInvoice } from './iazure-ocr.service';
import { FacturaProcesamientoResult } from '../../modules/registro-gastos/strategies/factura-procesar.strategy.interface';


@Injectable()
export class AzureOcrService implements ProcessInvoice {
  private client: DocumentAnalysisClient;

  constructor() {
    const endpoint = process.env.AZURE_OCR_ENDPOINT;
    const apiKey = process.env.AZURE_OCR_KEY;

    if (!endpoint || !apiKey) {
      throw new Error('Azure OCR credentials are not configured');
    }

    this.client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(apiKey), {
      retryOptions: {
        maxRetries: 3,
        retryDelayInMs: 1000,
        maxRetryDelayInMs: 4000
      }
    });
  }

  /**
   * Usa prebuilt-read (texto libre) en vez de prebuilt-invoice.
   * Acepta múltiples buffers (fotos de distintos tramos de la misma factura).
   * Cada imagen se parsea de forma independiente y luego se hace un merge
   * inteligente: para cada campo se elige el valor no-vacío más largo/preciso,
   * prefiriendo la imagen con mayor densidad de texto (generalmente la más nítida).
   */
  async processInvoice(fileBuffers: Buffer[]): Promise<FacturaProcesamientoResult> {
    try {
      // ── Paso 1: extraer texto de CADA imagen via Azure OCR ─────────────────
      const imageTexts: string[] = [];

      for (let i = 0; i < fileBuffers.length; i++) {
        const poller = await this.client.beginAnalyzeDocument('prebuilt-read', fileBuffers[i]);
        const result = await poller.pollUntilDone();
        const pageText = result.pages
          ?.flatMap(p => p.lines?.map(l => l.content) ?? [])
          .join('\n') ?? '';

        if (pageText.trim()) {
          console.log(`[AzureOCR] Imagen ${i + 1} extraída (${pageText.split('\n').length} líneas)`);
          imageTexts.push(pageText);
        } else {
          console.warn(`[AzureOCR] Imagen ${i + 1}: sin texto`);
        }
      }

      if (imageTexts.length === 0) {
        console.warn('[AzureOCR] No se extrajo texto de ninguna imagen.');
        return this.emptyResult();
      }

      // ── Paso 2: parsear TEXTO COMBINADO (ideal para facturas largas divididas) ──
      // Concatenar todas las imágenes en orden reconstruye el documento completo.
      // Esto permite que campos del encabezado (RUC, nombre) y del pie (TOTAL, CUFE)
      // se encuentren en un solo paso, sin depender del merge entre imágenes.
      const combinedText = imageTexts.join('\n');
      const combinedResult = this.parseDgiPanama(combinedText);
      console.log('[AzureOCR] Parse combinado:', combinedResult);

      // ── Paso 3: parsear CADA imagen por separado (refuerzo para fotos redundantes) ──
      // Útil cuando ambas fotos contienen la factura completa (ángulos/resoluciones
      // distintas de la misma toma). El merge elige el mejor valor por campo.
      const perImageResults = imageTexts.map(t => this.parseDgiPanama(t));

      // ── Paso 4: merge de TODOS los candidatos (combinado primero, luego por imagen) ──
      // Incluir el resultado combinado como primer candidato le da prioridad:
      // un campo encontrado en el texto completo es más confiable que uno
      // encontrado en una imagen parcial.
      const allResults = [combinedResult, ...perImageResults];
      const merged = this.mergeResults(allResults);
      console.log('[AzureOCR] Resultado final mergeado:', merged);
      return merged;

    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[AzureOCR] Error procesando la factura:', msg);
      throw new Error(`Error al procesar la factura con Azure OCR: ${msg}`);
    }
  }

  /**
   * Combina múltiples resultados priorizando el PRIMERO (parse del texto combinado).
   * El texto combinado ve toda la factura a la vez, por lo que es el candidato
   * más confiable. Solo se recurre a los resultados por imagen cuando el combinado
   * no encontró un campo (empty string o 0).
   *
   * results[0] = parse del texto combinado (siempre presente)
   * results[1..n] = parse de cada imagen por separado (refuerzo)
   */
  private mergeResults(results: FacturaProcesamientoResult[]): FacturaProcesamientoResult {
    const [combined, ...perImage] = results;

    // ── String: prioridad al combinado; fallback → el más largo de los por-imagen ──
    const bestStr = (key: keyof FacturaProcesamientoResult): string => {
      const val = (combined[key] as string ?? '').trim();
      if (val) return val;
      return perImage
        .map(r => (r[key] as string ?? '').trim())
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)[0] ?? '';
    };

    // ── RUC: prioridad al combinado; fallback → el MÁS CORTO de los por-imagen ──
    // (el RUC del validador es más largo que el del proveedor)
    const bestRuc = (): string => {
      const val = (combined.rucProveedor ?? '').trim();
      if (val) return val;
      const candidates = perImage
        .map(r => (r.rucProveedor ?? '').trim())
        .filter(Boolean);
      return candidates.sort((a, b) => a.length - b.length)[0] ?? '';
    };

    // ── Número: prioridad al combinado; fallback → el mayor de los por-imagen ──
    const bestNum = (key: keyof FacturaProcesamientoResult): number => {
      const val = (combined[key] as number) ?? 0;
      if (val) return val;
      return perImage
        .map(r => (r[key] as number) ?? 0)
        .filter(Boolean)
        .sort((a, b) => b - a)[0] ?? 0;
    };

    return {
      nombreProveedor: bestStr('nombreProveedor'),
      rucProveedor:    bestRuc(),
      dv:              bestStr('dv'),
      numeroFactura:   bestStr('numeroFactura'),
      fechaEmision:    bestStr('fechaEmision'),
      cufe:            bestStr('cufe'),
      montoTotal:      bestNum('montoTotal'),
      itbms:           bestNum('itbms'),
      subtotal:        bestNum('subtotal') || undefined,
    };
  }

  // ─── Parser específico para facturas DGI Panamá ───────────────────────────

  private parseDgiPanama(text: string): FacturaProcesamientoResult {
    // ── RUC y DV ──────────────────────────────────────────────────────────────
    // Panamá tiene dos formatos:
    //   • Panameño:   9-733-273   (solo dígitos)      → \d+-\d+-\d+
    //   • Extranjero: E-8-92906   (letra-dígitos)      → [A-Z]{1,2}-\d+-\d+
    //   • Extranjero: PE-20-1234  (dos letras-dígitos) → [A-Z]{2}-\d+-\d+
    // El separador RUC puede ser espacio, dos puntos o ambos: "RUC 9-733-273" / "RUC:E-8-92906"
    // NOTA: [A-Z]{0,2}-?\d+ NO funciona para E-8-92906 porque exige dígito tras la letra.
    // Solución: patrón alternado explícito.
    const rucMatch = text.match(/^\s*RUC[\s:]*(\d+-\d+-[\d\w]+|[A-Z]{1,2}-\d+-[\d\w]+)/im);
    const dvMatch  = text.match(/DV[\s:]*(\d+)/i);
    const rucProveedor = rucMatch?.[1]?.trim() ?? '';
    const dv           = dvMatch?.[1]?.trim()  ?? '';

    // ── Nombre del proveedor ──────────────────────────────────────────────────
    // La cabecera DGI suele tener el nombre comercial justo antes del RUC.
    // A veces hay líneas extra como "Factura de Operación Interna" o "Comprobante Auxiliar..."
    // que debemos ignorar si aparecen antes del nombre real.
    // Estrategia:
    // 1. Buscar línea inmediatamente anterior al RUC.
    // 2. Si esa línea es genérica ("Factura...", "Comprobante...", "DGI..."), buscar la anterior.
    // 3. Fallback: lógica original de 2 líneas si no se detectan frases genéricas.

    const lines = text.split(/\r?\n/);
    const rucIndex = lines.findIndex(l => /RUC[\s:]*[\d\w]+-[\d\w]+-[\d\w]+/i.test(l));
    
    let nombreProveedor = '';

    if (rucIndex > 0) {
        // Rastrear hacia arriba desde la línea del RUC
        for (let i = rucIndex - 1; i >= 0; i--) {
            const line = lines[i].trim();
            // Ignorar líneas vacías o muy cortas
            if (line.length < 3) continue;
            
            // Ignorar frases genéricas de facturación DGI
            const isGeneric = /factura|operation|interna|comprobante|auxiliar|electronica|dgi|fiscal|documento|oficial/i.test(line);
            
            if (!isGeneric) {
                nombreProveedor = line;
                break; // Encontramos el primer candidato no genérico
            }
        }
    }
    
    // Fallback: si no se encontró nada arriba o falló la heurística, usar lógica simple
    if (!nombreProveedor) {
         const nombreMatch = text.match(/([^\n]{4,})\n(?:[^\n]{4,}\n)?RUC/i); 
         nombreProveedor = (nombreMatch?.[1] ?? '').trim();
    }

    // ── Número de factura ─────────────────────────────────────────────────────
    // El OCR deforma "Número:" de estas formas conocidas:
    //   "N-mero: 1102_1/49303"  ← OCR degrada Número → N-mero  (caso de esta factura)
    //   "Número: 00123"         ← acento preservado
    //   "Numero: 00123"         ← sin acento
    //   "N° 013084019"          ← glifo de grado
    //   "N# 013084019"          ← variante tipográfica
    //   "Nro. 013084019"        ← abreviatura latina
    //   "No. 013084019"         ← variante anglosajona
    // El valor puede tener dígitos, guiones, guiones bajos y slashes: "1102_1/49303"
    //
    // IMPORTANTE: [char]?mero con ? falla porque el motor intenta primero
    // sin el char y no retrocede. Se usan alternativas explícitas en orden.
    const numMatch =
      text.match(/N[u\u00fa\-]mero[\s:]+([\w\/\-]{4,})/i) ??   // N-mero / Numero / Número
      text.match(/N[°#][\s]*([\w\/\-]{4,})/i) ??                // N° / N#
      text.match(/Nro?\.[\s]*([\w\/\-]{4,})/i) ??               // Nro. / No.
      text.match(/FACTURA[^\n]*?([\d]{6,})/i) ??                 // "Factura No 013084019"
      text.match(/NI\/(\d{4,})/i);                               // "NI/13084019" (DGI formato NI)
    const rawNum       = numMatch?.[1]?.trim() ?? '';
    const numeroFactura = /^[A-Z]{4,}$/i.test(rawNum) ? '' : rawNum;

    // ── Fecha de emisión ──────────────────────────────────────────────────────
    // Formatos conocidos:
    //   FECHA: 18/02/2026         ← comprobante auxiliar
    //   Fecha 14/noviembre/2025   ← factura electrónica con mes escrito
    //   14/11/2025                ← fecha libre
    const fechaMatch =
      text.match(/FECHA[\s:]+([\d]{1,2}\/[\d]{1,2}\/[\d]{4})/i) ??
      text.match(/Fecha[\s:]+([\d]{1,2}\/[\w]+\/[\d]{4})/i) ??
      text.match(/(\d{1,2}\/(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\/\d{4})/i) ??
      text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/i);
    const rawFecha = fechaMatch?.[1]?.trim() ?? '';

    // Normalizar a YYYY-MM-DD para compatibilidad con <input type="date"> y @IsDateString()
    const mesesOCR: Record<string, string> = {
      'enero':'01','febrero':'02','marzo':'03','abril':'04',
      'mayo':'05','junio':'06','julio':'07','agosto':'08',
      'septiembre':'09','octubre':'10','noviembre':'11','diciembre':'12',
    };
    const normOCR = (raw: string): string => {
      const ml = raw.match(/(\d{1,2})\/(\w+)\/(\d{4})/);
      if (ml) {
        const d = ml[1].padStart(2, '0');
        const m = mesesOCR[ml[2].toLowerCase()] ?? ml[2].padStart(2, '0');
        return `${ml[3]}-${m}-${d}`;
      }
      const mn = raw.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (mn) return `${mn[3]}-${mn[2].padStart(2,'0')}-${mn[1].padStart(2,'0')}`;
      return raw;
    };
    const fechaEmision = normOCR(rawFecha);

    // ── TOTAL ────────────────────────────────────────────────────────────────
    // Estrategia robusta: líneas con TOTAL, y como último recurso el mayor monto del documento.
    const totalCandidates: number[] = [];
    lines.forEach((line, idx) => {
      const clean = line.trim();
      const next = (lines[idx + 1] ?? '').trim();

      // Caso 1: línea es SOLO TOTAL
      if (/^TOTAL$/i.test(clean) && /\d+[.,]\d{2}/.test(next)) {
        totalCandidates.push(parseFloat(next.replace(',', '.')));
      }

      // Caso 2: TOTAL en la misma línea con importe
      const sameLine = clean.match(/TOTAL[^\d]*([\d]+[.,][\d]{2})/i);
      if (sameLine) totalCandidates.push(parseFloat(sameLine[1].replace(',', '.')));
    });

    // Fallback: cualquier TOTAL en bloque de texto
    const anyTotal = Array.from(text.matchAll(/TOTAL[^\d\n]*([\d]+[.,][\d]{2})/ig))
      .map(m => parseFloat(m[1].replace(',', '.')));
    totalCandidates.push(...anyTotal);

    // Fallback final: mayor monto numérico del documento (útil si OCR deformó "TOTAL")
    const allAmounts = Array.from(text.matchAll(/([\d]+[.,][\d]{2})/g))
      .map(m => parseFloat(m[1].replace(',', '.')));
    if (totalCandidates.length === 0 && allAmounts.length > 0) {
      totalCandidates.push(Math.max(...allAmounts));
    }

    let montoTotal = totalCandidates.length ? Math.max(...totalCandidates) : 0;

    // ── ITBMS ─────────────────────────────────────────────────────────────────
    // Formato 1 – factura electrónica:  "Total Impuestos\n0.41"
    // Formato 2 – comprobante auxiliar: "ITBMS  0.00"  (columna en la misma línea)
    // Formato 3 – desglose:             "Impuesto\n0.41"
    const itbmsMatch =
      text.match(/Total\s+Impuestos\s*\r?\n\s*([\d]+\.[\d]{2})/i) ??
      text.match(/^ITBMS\s+([\d]+\.[\d]{2})\s*$/im) ??
      text.match(/^Impuesto\s*\r?\n\s*([\d]+\.[\d]{2})/im);
    const itbms = parseFloat(itbmsMatch?.[1] ?? '0') || 0;
    // ── SUBTOTAL / TOTAL NETO ───────────────────────────────────────────────
    const subtotalCandidates: number[] = [];
    const pushNum = (m?: string) => { if (m) subtotalCandidates.push(parseFloat(m.replace(',', '.'))); };

    // Subtotal explícito en misma o siguiente línea
    lines.forEach((line, idx) => {
      const clean = line.trim();
      const next = (lines[idx + 1] ?? '').trim();
      const same = clean.match(/SUBTOTAL[^\d]*([\d]+[.,][\d]{2})/i);
      const nextLine = /^SUBTOTAL$/i.test(clean) ? next.match(/([\d]+[.,][\d]{2})/) : null;
      if (same) pushNum(same[1]);
      if (nextLine) pushNum(nextLine[1]);
    });

    // Total Neto como sinónimo de subtotal
    const totalNeto = text.match(/Total\s+Neto[^\d\n]*([\d]+[.,][\d]{2})/i)
      ?? text.match(/Total\s+Neto\s*\r?\n\s*([\d]+[.,][\d]{2})/i);
    if (totalNeto) pushNum(totalNeto[1]);

    // Monto Base (línea del desglose de ITBMS) suele ser el subtotal
    const montoBase = text.match(/Monto\s+Base[^\d]*([\d]+[.,][\d]{2})/i);
    if (montoBase) pushNum(montoBase[1]);

    let subtotal = subtotalCandidates.length ? Math.max(...subtotalCandidates) : undefined;

    // Reconciliar totales si hay inconsistencias
    if (subtotal && montoTotal && subtotal > montoTotal && itbms >= 0) {
      montoTotal = +(subtotal + itbms).toFixed(2);
    }

    if (!subtotal && montoTotal && itbms && montoTotal > itbms) {
      const calc = +(montoTotal - itbms).toFixed(2);
      if (calc > 0) subtotal = calc;
    }
    // ── CUFE ──────────────────────────────────────────────────────────────────
    // Solo existe en facturas electrónicas DGI. Su formato es:
    //   FE + RUC/correlativo + fecha (≥ 30 caracteres alfanuméricos con guiones)
    // Los Comprobantes Auxiliares NO tienen CUFE — campo queda vacío.
    // El CUFE puede aparecer partido en 2 líneas:
    //   CUFE
    //   FE011000000000009-733-273-970...   ← línea 1
    //   010112764351923/                   ← línea 2
    const cufeBlock = text.match(/CUFE\s*\r?\n([\s\S]{10,400}?)(?:\n[A-ZÁÉÍÓÚ\n]|\n\n|$)/i);
    const cufe = cufeBlock
      ? cufeBlock[1].replace(/[\s\/]/g, '').match(/(FE[\w\-]{20,})/i)?.[1] ?? ''
      : (text.match(/(FE[0-9A-Za-z\-]{30,})/)?.[1] ?? '');

    return { montoTotal, subtotal, itbms, fechaEmision, rucProveedor, dv, nombreProveedor, cufe, numeroFactura };
  }


  private emptyResult(): FacturaProcesamientoResult {
    return { montoTotal: 0, subtotal: undefined, itbms: 0, fechaEmision: '', rucProveedor: '', dv: '', nombreProveedor: '', cufe: '', numeroFactura: '' };
  }
}