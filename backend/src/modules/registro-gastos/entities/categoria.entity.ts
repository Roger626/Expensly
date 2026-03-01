export class CategoriaEntity {
    id: string;
    organizacionId: string;
    nombre: string;
    codigoContable?: string;

    constructor(data: any) {
        this.id = data.id;
        this.organizacionId = data.organizacion_id;
        this.nombre = data.nombre;
        this.codigoContable = data.codigo_contable;
    }
}
