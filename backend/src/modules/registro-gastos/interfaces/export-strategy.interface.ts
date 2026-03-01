/**
 * Contrato para cualquier estrategia de exportación de facturas.
 * Las implementaciones reciben un array de IDs y devuelven el Buffer
 * del archivo generado.
 */
export interface IExportStrategy {
    /** @param organizacionId  Org del usuario que solicita la exportación.
     *  Solo se exportarán facturas que pertenezcan a esa organización. */
    export(ids: string[], organizacionId: string): Promise<Buffer>;
}

export const EXPORT_STRATEGY = 'EXPORT_STRATEGY';
