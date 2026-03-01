import { Factura } from '../../registro-factura/models/factura.model';

// ─────────────────────────────────────────────────────────────────────────────
// Shape that the backend FacturaEntity actually serialises to JSON
// ─────────────────────────────────────────────────────────────────────────────
export interface FacturaImagenApiResponse {
  id: string;
  url: string;
  publicId: string;
  orden: number;
}

export interface FacturaApiResponse {
  id: string;
  usuarioId: string | null;
  nombreEmpleado: string | null;
  categoria: string | null;
  montoTotal: number;
  subtotal: number | null;
  itbms: number | null;
  fechaEmision: string;
  rucProveedor: string | null;
  dv: string | null;
  nombreProveedor: string | null;
  numeroFactura: string;
  cufe: string | null;
  imagenes: FacturaImagenApiResponse[];
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | null;
  motivoRechazo: string | null;
  facturaTags: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapper  FacturaApiResponse → Factura (frontend view-model)
// ─────────────────────────────────────────────────────────────────────────────
export function mapFacturaApiToModel(api: FacturaApiResponse): Factura {
  return {
    facturaId:      api.id,
    usuarioId:      api.usuarioId      ?? undefined,
    nombreEmpleado: api.nombreEmpleado ?? undefined,
    categoria:      api.categoria      ?? undefined,
    montoTotal:     api.montoTotal,
    subtotal:       api.subtotal       ?? undefined,
    itbms:          api.itbms          ?? undefined,
    fechaEmision:   api.fechaEmision,
    rucProveedor:   api.rucProveedor   ?? '',
    dv:             api.dv             ?? undefined,
    nombreProveedor: api.nombreProveedor ?? '',
    numeroFactura:  api.numeroFactura,
    cufe:           api.cufe           ?? '',
    imagenes:       api.imagenes,
    estado:         api.estado         ?? undefined,
    motivoRechazo:  api.motivoRechazo  ?? undefined,
    facturaTags:    api.facturaTags    ?? [],
  };
}
