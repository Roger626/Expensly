import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IExportStrategy } from '../interfaces/export-strategy.interface';
import { RegistroGastosRepository } from '../repositories/registro-gastos.repository';
import { ExcelService } from 'src/infrastructure/storage/excel.service';
import { FacturaEntity } from '../entities/factura.entity';

/**
 * Exportación contable de facturas para Panamá.
 *
 * Reglas legales / de negocio:
 *  - Solo se exportan facturas en estado APROBADO (DGI, Ley 76 de 2019).
 *  - Los campos siguen el estándar de la e-Factura panameña (CUFE, RUC-DV, ITBMS 7 %).
 *  - El layout de columnas es compatible con los principales softwares contables
 *    usados en Panamá: Monica, SAP Business One, QuickBooks, Softland y Siigo.
 *  - Los montos se exportan como números (no texto) para permitir fórmulas.
 *  - La fecha se exporta en formato DD/MM/YYYY (estándar panameño).
 */
@Injectable()
export class ExcelExportStrategy implements IExportStrategy {

    constructor(
        private readonly repository: RegistroGastosRepository,
        private readonly excelService: ExcelService,
    ) {}

    async export(ids: string[], organizacionId: string): Promise<Buffer> {

        // ── 1. Buscar facturas (solo de la organización del solicitante) ────
        const settled = await Promise.allSettled(
            ids.map((id) => this.repository.getFacturaById(id, organizacionId)),
        );

        const facturas: FacturaEntity[] = [];
        const notFound: string[]        = [];

        settled.forEach((r, i) => {
            r.status === 'fulfilled'
                ? facturas.push(r.value)
                : notFound.push(ids[i]);
        });

        if (notFound.length) {
            throw new NotFoundException(
                `Facturas no encontradas: ${notFound.join(', ')}`,
            );
        }

        // ── 2. Validación legal: solo APROBADO puede exportarse ─────────────
        const noAprobadas = facturas
            .filter((f) => f.estado !== 'APROBADO')
            .map((f) => `${f.numeroFactura ?? f.id} [${f.estado ?? 'SIN ESTADO'}]`);

        if (noAprobadas.length) {
            throw new BadRequestException(
                'Solo se pueden exportar facturas APROBADAS. ' +
                `Las siguientes no cumplen ese requisito: ${noAprobadas.join(', ')}`,
            );
        }

        // ── 3. Ordenar por fecha de emisión ascendente (útil para contabilidad)
        facturas.sort((a, b) =>
            new Date(a.fechaEmision ?? 0).getTime() -
            new Date(b.fechaEmision ?? 0).getTime(),
        );

        // ── 4. Mapear y generar ─────────────────────────────────────────────
        const rows = facturas.map((f, i) => this._mapToAccountingRow(f, i + 1));
        return this.excelService.generateExcel(rows);
    }

    // ── Mapping ─────────────────────────────────────────────────────────────

    /**
     * Layout de columnas diseñado para el libro de compras panameño
     * y compatible con la importación de los principales ERP/contables.
     *
     * IMPORTANTE: FacturaEntity se construye con Object.assign() desde el resultado
     * de Prisma, por lo que los campos disponibles en tiempo de ejecución son los
     * nombres originales de la BD (snake_case) y las relaciones incluidas.
     * Los @Transform() de class-transformer solo se aplican durante la serialización
     * HTTP vía ClassSerializerInterceptor, NO aquí.
     * Por eso accedemos a los campos raw mediante el cast `(f as any)`.
     */
    private _mapToAccountingRow(
        f: FacturaEntity,
        seq: number,
    ): Record<string, unknown> {
        const raw = f as any;

        const subtotal = this._decimal(raw.subtotal);
        const itbms    = this._decimal(raw.itbms);
        const total    = this._decimal(raw.monto_total);

        // Si no informaron subtotal lo calculamos a partir del total e ITBMS
        const baseImponible = subtotal > 0
            ? subtotal
            : parseFloat((total - itbms).toFixed(2));

        const ruc = raw.ruc_proveedor ?? '';
        const dv  = raw.dv_proveedor  ?? '';

        return {
            // ── Correlativo ──────────────────────────────────────
            '#':                        seq,

            // ── Datos fiscales del documento (obligatorios DGI) ──
            'Nº Factura':               raw.numero_factura  ?? '',
            'CUFE':                     raw.cufe            ?? '',
            'Fecha Emisión':            this._fmtDate(raw.fecha_emision),

            // ── Datos del proveedor (obligatorios DGI) ───────────
            'RUC Proveedor':            ruc,
            'DV':                       dv,
            'RUC-DV':                   this._rucDv(ruc, dv),
            'Nombre / Razón Social':    raw.nombre_proveedor             ?? '',

            // ── Montos (campos separados requeridos por contabilidad)
            'Base Imponible (B/.)':     baseImponible,
            'ITBMS 7 % (B/.)':          itbms,
            'Total Factura (B/.)':      total,

            // ── Clasificación interna ────────────────────────────
            'Categoría de Gasto':       raw.categorias?.nombre           ?? '',
            'Responsable':              raw.usuarios?.nombre_completo    ?? '',
        };
    }

    // ── Utilidades privadas ─────────────────────────────────────────────────

    /** Convierte un Prisma Decimal (o number/null/undefined) en número JS seguro. */
    private _decimal(v: any): number {
        if (v === null || v === undefined) return 0;
        if (typeof v === 'number') return isNaN(v) ? 0 : v;
        if (typeof v.toNumber === 'function') return v.toNumber();
        const n = parseFloat(String(v));
        return isNaN(n) ? 0 : n;
    }

    /** Formato de fecha DD/MM/YYYY estándar panameño. */
    private _fmtDate(iso: string | null | undefined): string {
        if (!iso) return '';
        const d = new Date(iso);
        const dd   = String(d.getUTCDate()).padStart(2, '0');
        const mm   = String(d.getUTCMonth() + 1).padStart(2, '0');
        const yyyy = d.getUTCFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }

    /** RUC con guion y DV (ej. 8-123-456-7). */
    private _rucDv(ruc: string | null | undefined, dv: string | null | undefined): string {
        if (!ruc) return '';
        return dv ? `${ruc}-${dv}` : ruc;
    }
}
