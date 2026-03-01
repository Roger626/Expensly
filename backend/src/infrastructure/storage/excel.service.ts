import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

/**
 * Servicio agnóstico de infraestructura.
 * Transforma un array de objetos planos en un Buffer de archivo .xlsx
 * con formato profesional:
 *  - Encabezados en fila 1 (negrita vía cell comment no disponible en open-xlsx).
 *  - Columnas monetarias con formato numérico de 2 decimales.
 *  - Columnas de fecha preservadas como texto en formato DD/MM/YYYY.
 *  - Autofilter activado sobre la primera fila.
 *  - Anchos de columna calculados automáticamente.
 */
@Injectable()
export class ExcelService {

    /** Columnas cuyo valor debe almacenarse como número en Excel. */
    private readonly MONEY_COLS = [
        'Base Imponible (B/.)',
        'ITBMS 7 % (B/.)',
        'Total Factura (B/.)',
    ];

    generateExcel(data: Record<string, unknown>[]): Buffer {
        if (!data.length) {
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([]), 'Compras');
            return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
        }

        const headers = Object.keys(data[0]);

        // ── Construir matriz AOA (array-of-arrays) para control total de celdas ──
        const aoa: unknown[][] = [headers];

        for (const row of data) {
            aoa.push(headers.map((h) => row[h] ?? ''));
        }

        const worksheet = XLSX.utils.aoa_to_sheet(aoa);

        // ── Formatos numéricos para columnas monetarias ───────────────────────
        const moneyFmt = '#,##0.00';
        headers.forEach((h, colIdx) => {
            if (!this.MONEY_COLS.includes(h)) return;
            // Aplicar formato a cada celda de datos (fila 2 en adelante)
            for (let rowIdx = 1; rowIdx < aoa.length; rowIdx++) {
                const addr = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx });
                const cell = worksheet[addr];
                if (cell && typeof cell.v === 'number') {
                    cell.t = 'n';
                    cell.z = moneyFmt;
                }
            }
        });

        // ── Anchos de columna automáticos ────────────────────────────────────
        worksheet['!cols'] = headers.map((h) => {
            const maxLen = data.reduce((acc, row) => {
                const val = row[h] !== null && row[h] !== undefined ? String(row[h]) : '';
                return Math.max(acc, val.length);
            }, h.length);
            return { wch: Math.min(maxLen + 3, 60) };
        });

        // ── Autofilter sobre la fila de encabezados ───────────────────────────
        const lastCol = XLSX.utils.encode_col(headers.length - 1);
        worksheet['!autofilter'] = { ref: `A1:${lastCol}1` };

        // ── Fijar primera fila (freeze panes) ─────────────────────────────────
        worksheet['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' } as any;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Compras');

        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
    }
}

