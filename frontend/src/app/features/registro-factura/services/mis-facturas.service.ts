import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';

import { Factura } from '../models/factura.model';
import { FacturaApiResponse, mapFacturaApiToModel } from '../../admin/models/admin-factura.model';
import { InvoiceFilterState, DEFAULT_FILTER } from '../../admin/models/invoice-filter-state.model';

@Injectable({ providedIn: 'root' })
export class MisFacturasService {

  private readonly API = 'http://localhost:3000/api/registro-gastos';

  // ── Private state ─────────────────────────────────────────────────────────
  private readonly _facturas$     = new BehaviorSubject<Factura[]>([]);
  private readonly _isLoading$    = new BehaviorSubject<boolean>(false);
  private readonly _error$        = new BehaviorSubject<string | null>(null);
  private readonly _currentPage$  = new BehaviorSubject<number>(1);
  private readonly _itemsPerPage$ = new BehaviorSubject<number>(10);
  private readonly _filter$       = new BehaviorSubject<InvoiceFilterState>(DEFAULT_FILTER);

  // ── Public streams ────────────────────────────────────────────────────────
  readonly isLoading$    = this._isLoading$.asObservable();
  readonly error$        = this._error$.asObservable();
  readonly currentPage$  = this._currentPage$.asObservable();
  readonly itemsPerPage$ = this._itemsPerPage$.asObservable();
  readonly filter$       = this._filter$.asObservable();

  /** Categorías únicas derivadas de la lista completa. */
  readonly availableCategories$: Observable<string[]> = this._facturas$.pipe(
    map(list => {
      const cats = new Set(list.map(f => f.categoria).filter((c): c is string => !!c));
      return [...cats].sort();
    }),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
  );

  /** Facturas filtradas. */
  readonly filteredFacturas$: Observable<Factura[]> = combineLatest([
    this._facturas$,
    this._filter$,
  ]).pipe(
    map(([facturas, filter]) => {
      let result = facturas;

      // Text search
      const term = filter.searchTerm.toLowerCase().trim();
      if (term) {
        result = result.filter(f =>
          f.nombreProveedor?.toLowerCase().includes(term)  ||
          f.rucProveedor?.toLowerCase().includes(term)     ||
          f.numeroFactura?.toLowerCase().includes(term)    ||
          f.cufe?.toLowerCase().includes(term)             ||
          f.categoria?.toLowerCase().includes(term),
        );
      }

      // Date range
      if (filter.dateFrom) {
        const from = new Date(filter.dateFrom).getTime();
        result = result.filter(f => new Date(f.fechaEmision).getTime() >= from);
      }
      if (filter.dateTo) {
        const to = new Date(filter.dateTo).getTime() + 86_400_000 - 1;
        result = result.filter(f => new Date(f.fechaEmision).getTime() <= to);
      }

      // Categories
      if (filter.selectedCategories.length > 0) {
        const cats = new Set(filter.selectedCategories);
        result = result.filter(f => f.categoria && cats.has(f.categoria));
      }

      // Status
      if (filter.selectedStatuses.length > 0) {
        const statuses = new Set(filter.selectedStatuses);
        result = result.filter(f => f.estado && statuses.has(f.estado));
      }

      return result;
    }),
  );

  readonly totalItems$: Observable<number> = this.filteredFacturas$.pipe(
    map(list => list.length),
  );

  readonly pagedFacturas$: Observable<Factura[]> = combineLatest([
    this.filteredFacturas$,
    this._currentPage$,
    this._itemsPerPage$,
  ]).pipe(
    map(([facturas, page, size]) => facturas.slice((page - 1) * size, page * size)),
  );

  readonly stats$ = this._facturas$.pipe(
    map(facturas => {
      const hoy  = new Date();
      const mes  = hoy.getMonth();
      const anio = hoy.getFullYear();
      return {
        total:        facturas.length,
        aprobadas:    facturas.filter(f => f.estado === 'APROBADO').length,
        pendientes:   facturas.filter(f => f.estado === 'PENDIENTE').length,
        rechazadas:   facturas.filter(f => f.estado === 'RECHAZADO').length,
        totalGastado: facturas.filter(f => f.estado === 'APROBADO').reduce((s, f) => s + f.montoTotal, 0),
        esteMes:      facturas.filter(f => {
          const d = new Date(f.fechaEmision);
          return d.getMonth() === mes && d.getFullYear() === anio;
        }).length,
      };
    }),
  );

  constructor(private readonly http: HttpClient) {}

  // ── Load ──────────────────────────────────────────────────────────────────

  loadMine(): void {
    if (this._isLoading$.getValue()) return;
    this._isLoading$.next(true);
    this._error$.next(null);

    this.http.get<FacturaApiResponse[]>(`${this.API}/mis-facturas`).subscribe({
      next: (data) => {
        this._facturas$.next(data.map(mapFacturaApiToModel));
        this._isLoading$.next(false);
      },
      error: () => {
        this._error$.next('No se pudieron cargar tus facturas. Intenta nuevamente.');
        this._isLoading$.next(false);
      },
    });
  }

  refresh(): void {
    this._isLoading$.next(false);
    this.loadMine();
  }

  // ── Filter / Pagination ───────────────────────────────────────────────────

  setFilter(state: InvoiceFilterState): void {
    this._filter$.next(state);
    this._currentPage$.next(1);
  }

  setStatusFilter(statuses: string[]): void {
    const current = this._filter$.getValue();
    this._filter$.next({ ...current, selectedStatuses: statuses });
    this._currentPage$.next(1);
  }

  goToPage(page: number): void {
    this._currentPage$.next(page);
  }

  /** Snapshot del filtro actual (para merge en el componente). */
  getCurrentFilter(): InvoiceFilterState {
    return this._filter$.getValue();
  }

  // ── CRUD (employee-owned, PENDIENTE only) ─────────────────────────────────

  updateFactura(id: string, dto: Record<string, any>): Observable<FacturaApiResponse> {
    return this.http.patch<FacturaApiResponse>(`${this.API}/${id}/update-mine`, dto);
  }

  deleteFactura(id: string): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}/delete-mine`);
  }

  /** Reemplaza la factura en la lista local tras una edición exitosa. */
  replaceFactura(updated: FacturaApiResponse): void {
    const mapped = mapFacturaApiToModel(updated);
    const list   = this._facturas$.getValue().map(f =>
      f.facturaId === mapped.facturaId ? mapped : f
    );
    this._facturas$.next(list);
  }

  /** Elimina la factura de la lista local tras un borrado exitoso. */
  removeFactura(id: string): void {
    this._facturas$.next(this._facturas$.getValue().filter(f => f.facturaId !== id));
  }
}
