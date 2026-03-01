import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject} from 'rxjs';
import { ProcesarFacturaResponse, Factura, FacturaProcesamientoResult, CreateFacturaDto } from '../models/factura.model';
import { AuthService } from '../../auth/services/auth.service';
import { CategoriaDto } from '../models/categoria.model';


@Injectable({
  providedIn: 'root'
})
export class RegistroFacturaService {
    private readonly API_URL        = 'http://localhost:3000/api/registro-gastos';
    private readonly CATEGORIAS_URL = 'http://localhost:3000/api/categorias';

    private facturaDataSubject = new BehaviorSubject<ProcesarFacturaResponse | null>(null);
    facturaData$ = this.facturaDataSubject.asObservable();

    private categoriasSubject = new BehaviorSubject<CategoriaDto[]>([]);
    categorias$ = this.categoriasSubject.asObservable();

    constructor(private http: HttpClient, private authService: AuthService) {}

    subirArchivos(archivos: File[], clientQrData?: string): Observable<ProcesarFacturaResponse> {
      const formData = new FormData();
      archivos.forEach(f => formData.append('files', f));
      // Incluir el QR escaneado en el browser si lo hay.
      // El backend lo usará para verificación antes de llamar a Azure OCR.
      if (clientQrData) {
        formData.append('clientQrData', clientQrData);
      }
      return this.http.post<ProcesarFacturaResponse>(`${this.API_URL}/procesar-factura`, formData);
    }

    createFactura(dto: CreateFacturaDto): Observable<Factura>{
      return this.http.post<Factura>(`${this.API_URL}/create`, dto);
    }

    setFacturaData(data: ProcesarFacturaResponse): void {
      this.facturaDataSubject.next(data);
    }

    clearFacturaData(): void {
      this.facturaDataSubject.next(null);
    }

    /** Carga las categorías de la organización del usuario autenticado. El token
     *  se adjunta automáticamente por el jwtInterceptor. */
    cargarCategorias(): void {
        const orgId = this.authService.organizationId();
        if (!orgId) return;

        // Solo carga si aún no hay datos en caché
        if (this.categoriasSubject.value.length === 0) {
            this.http.get<CategoriaDto[]>(`${this.CATEGORIAS_URL}/organizacion/${orgId}`).subscribe({
                next: (categorias) => this.categoriasSubject.next(categorias),
                error: (error) => console.error('Error al cargar categorías:', error),
            });
        }
    }

    /** Fuerza una recarga de categorías (útil tras crear/editar/borrar una). */
    recargarCategorias(): void {
        this.categoriasSubject.next([]);
        this.cargarCategorias();
    }
}
