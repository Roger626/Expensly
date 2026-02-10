import { Exclude, Expose, Transform } from 'class-transformer';

@Exclude()
export class FacturaEntity {
  // ========= Identidad =========

  @Expose()
  id: string;

  // ========= Clasificación =========

  @Expose()
  @Transform(({ obj }) => obj.categoria_id)
  categoriaId?: string;

  // ========= Montos =========

  @Expose()
  @Transform(({ obj }) => obj.monto_total?.toNumber())
  montoTotal: number;

  @Expose()
  @Transform(({ obj }) => obj.itbms?.toNumber())
  itbms?: number;

  // ========= Fechas =========

  @Expose()
  @Transform(({ obj }) => obj.fecha_emision?.toISOString())
  fechaEmision: string;

  // ========= Proveedor =========

  @Expose()
  @Transform(({ obj }) => obj.ruc_proveedor)
  rucProveedor?: string;

  @Expose()
  @Transform(({ obj }) => obj.nombre_proveedor)
  nombreProveedor?: string;

  @Expose()
  @Transform(({ obj }) => obj.numero_factura)
  numeroFactura: string;

  @Expose()
  @Transform(({ obj }) => obj.cufe)
  cufe?: string;

  // ========= Documento =========

  @Expose()
  @Transform(({ obj }) => obj.url_imagen)
  urlImagen: string;

  @Expose()
  @Transform(({ obj }) => obj.image_public_id)
  imagePublicId: string;

  // ========= Estado =========

  @Expose()
  @Transform(({ obj }) => obj.estado)
  estado?: string;

  @Expose()
  @Transform(({ obj }) => obj.motivo_rechazo)
  motivoRechazo?: string;

  // ========= Tags =========

  @Expose()
  @Transform(({ obj }) =>
    obj.factura_tags?.map((t) => t.tag),
  )
  facturaTags?: string[];

  constructor(partial: Partial<FacturaEntity>) {
    Object.assign(this, partial);
  }
}
