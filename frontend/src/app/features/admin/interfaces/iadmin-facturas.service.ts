import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Factura } from '../../registro-factura/models/factura.model';
import { InvoiceFilterState } from '../models/invoice-filter-state.model';

// ─────────────────────────────────────────────────────────────────────────────
// Interface  (Interface Segregation + Dependency Inversion)
// Los componentes dependen de esta abstracción, no del servicio concreto.
// ─────────────────────────────────────────────────────────────────────────────
export interface IAdminFacturasService {
  // ── Estado reactivo (Observables) ───────────────────────────────────────
  readonly facturas$:             Observable<Factura[]>;
  readonly isLoading$:            Observable<boolean>;
  readonly error$:                Observable<string | null>;
  readonly totalItems$:           Observable<number>;
  readonly currentPage$:          Observable<number>;
  readonly itemsPerPage$:         Observable<number>;
  /** Slice de facturas para la página actual (ya filtradas). */
  readonly pagedFacturas$:        Observable<Factura[]>;
  /** Lista completa filtrada (sin paginar) — para navegación modal. */
  readonly filteredFacturas$:     Observable<Factura[]>;
  /** Estado actual del filtro. */
  readonly filter$:               Observable<InvoiceFilterState>;
  /** Categorías únicas disponibles (sin filtrar). */
  readonly availableCategories$:  Observable<string[]>;

  // ── Comandos ─────────────────────────────────────────────────────────────
  /** Carga todas las facturas de la API (no-op si ya está cargando). */
  loadAll(): void;
  /** Navega a una página específica. */
  goToPage(page: number): void;
  /** Actualiza los filtros y resetea a la primera página. */
  setFilter(state: InvoiceFilterState): void;
  /** Limpia la caché y recarga desde la API. */
  refresh(): void;
  /** Aprueba o rechaza una factura. */
  updateEstado(id: string, estado: string, motivoRechazo?: string): Observable<Factura>;
  /** Exporta un subconjunto de facturas a Excel (devuelve el Blob del .xlsx). */
  exportToExcel(ids: string[]): Observable<Blob>;
}


// DI token para que los componentes declaren IAdminFacturasService como dependencia
export const ADMIN_FACTURAS_SERVICE =
  new InjectionToken<IAdminFacturasService>('IAdminFacturasService');
