import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { combineLatest } from 'rxjs';
import { map, take } from 'rxjs/operators';

import { MisFacturasService } from '../../services/mis-facturas.service';
import { RegistroFacturaService } from '../../services/registro-factura.service';
import { FacturaCardTableComponent } from '../../components/factura-card-table/factura-card-table.component';
import { FacturaEmpleadoModalComponent } from '../../components/factura-empleado-modal/factura-empleado-modal.component';
import { InvoiceFilterComponent } from '../../../admin/components/invoice-filter/invoice-filter.component';
import { InvoiceFilterState, DEFAULT_FILTER } from '../../../admin/models/invoice-filter-state.model';
import { Factura } from '../../models/factura.model';

const STATUSES = ['PENDIENTE', 'APROBADO', 'RECHAZADO'] as const;

@Component({
  selector: 'app-lista-facturas',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FacturaCardTableComponent,
    FacturaEmpleadoModalComponent,
    InvoiceFilterComponent,
  ],
  templateUrl: './lista-facturas.component.html',
  styleUrl: './lista-facturas.component.css',
})
export class ListaFacturasComponent implements OnInit {

  private readonly svc      = inject(MisFacturasService);
  private readonly regSvc   = inject(RegistroFacturaService);

  protected readonly statuses = STATUSES;

  // ── ViewModel ─────────────────────────────────────────────────────────────
  protected readonly vm$ = combineLatest([
    this.svc.pagedFacturas$,
    this.svc.totalItems$,
    this.svc.currentPage$,
    this.svc.itemsPerPage$,
    this.svc.isLoading$,
    this.svc.error$,
    this.svc.stats$,
    this.svc.availableCategories$,
    this.svc.filter$,
    this.regSvc.categorias$,
  ]).pipe(
    map(([facturas, totalItems, currentPage, itemsPerPage, isLoading, error, stats, categories, filter, categorias]) => ({
      facturas, totalItems, currentPage, itemsPerPage, isLoading, error, stats, categories, filter, categorias,
    })),
  );

  // ── Modal state ───────────────────────────────────────────────────────────
  protected modalOpen      = false;
  protected modalInvoices: Factura[] = [];
  protected modalIndex     = 0;

  ngOnInit(): void {
    this.svc.loadMine();
    this.regSvc.cargarCategorias();
  }

  // ── Filter handlers ───────────────────────────────────────────────────────

  onFilterChange(state: InvoiceFilterState): void {
    // Preserve selected statuses when other filters change
    const current = this.svc.getCurrentFilter();
    this.svc.setFilter({ ...state, selectedStatuses: current.selectedStatuses });
  }

  onStatusToggle(status: string, current: InvoiceFilterState): void {
    const set = new Set(current.selectedStatuses);
    set.has(status) ? set.delete(status) : set.add(status);
    this.svc.setStatusFilter([...set]);
  }

  onClearFilters(): void {
    this.svc.setFilter(DEFAULT_FILTER);
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  onPageChange(page: number): void {
    this.svc.goToPage(page);
  }

  onRefresh(): void {
    this.svc.refresh();
  }

  // ── Modal ─────────────────────────────────────────────────────────────────

  onOpenFactura(invoice: Factura): void {
    this.svc.filteredFacturas$.pipe(take(1)).subscribe(all => {
      // Spread into a new array so Angular always detects the [invoices] change.
      this.modalInvoices = [...all];
      this.modalIndex    = all.findIndex(f => f.facturaId === invoice.facturaId);
      if (this.modalIndex === -1) this.modalIndex = 0;
      this.modalOpen = true;
    });
  }

  onModalClose(): void {
    this.modalOpen = false;
  }
}
