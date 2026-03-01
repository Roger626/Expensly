export interface FacturaProcesamientoResult {
        montoTotal: number;
        subtotal?: number;
        itbms?: number;
        fechaEmision: string;
        rucProveedor: string;
        dv: string;
        nombreProveedor: string;
        cufe: string;
        numeroFactura: string;
        urlImagen?: string;
        /** Todas las URLs de Cloudinary (una por imagen subida) */
        imageUrls?: string[];
        imagePublicId?: string;
        imagenes?: { url: string; publicId: string; orden: number }[];
}

// Payload que debe cumplir con CreateFacturaDto del backend
export interface CreateFacturaDto {
    categoriaId: string;
    monto: number;
    subtotal?: number;
    impuesto?: number;
    fechaEmision: string;
    rucProveedor: string;
    dvProveedor?: string;
    nombreProveedor: string;
    numeroFactura: string;
    cufe?: string;
    // Nuevo campo obligatorio
    imagenesFactura: { url: string; publicId: string }[];
    facturaTags?: string[];
}

export interface ProcesarFacturaResponse {
    message: string;
    data: FacturaProcesamientoResult;
}

export interface Factura {
    facturaId: string;
    usuarioId?: string;
    nombreEmpleado?: string;
    montoTotal: number;
    subtotal?: number;
    itbms?: number;
    fechaEmision: string;
    rucProveedor: string;
    dv?: string;
    nombreProveedor: string;
    cufe: string;
    numeroFactura: string;
    urlImagen?: string;
    imageUrls?: string[];
    imagePublicId?: string;
    imagenes?: { id: string; url: string; publicId: string; orden: number }[];
    categoria?: string;
    estado?: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
    motivoRechazo?: string;
    facturaTags?: string[];
}