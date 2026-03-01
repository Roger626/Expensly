import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Factura } from '../../../registro-factura/models/factura.model';

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './invoice-list.component.html',
  styleUrl: './invoice-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceListComponent {
  @Input() invoices: Factura[] = [];
  @Input() totalItems = 0;
  @Input() itemsPerPage = 10;
  @Input() currentPage = 1;

  @Output() pageChange       = new EventEmitter<number>();
  @Output() selectionChange  = new EventEmitter<string[]>();
  @Output() openInvoice      = new EventEmitter<Factura>();

  private selectedIds = new Set<string>();

  // ========= Selection =========

  get allSelected(): boolean {
    return this.invoices.length > 0 && this.invoices.every(i => this.selectedIds.has(i.facturaId));
  }

  get someSelected(): boolean {
    return this.invoices.some(i => this.selectedIds.has(i.facturaId)) && !this.allSelected;
  }

  isSelected(invoice: Factura): boolean {
    return this.selectedIds.has(invoice.facturaId);
  }

  toggleSelection(invoice: Factura): void {
    if (this.selectedIds.has(invoice.facturaId)) {
      this.selectedIds.delete(invoice.facturaId);
    } else {
      this.selectedIds.add(invoice.facturaId);
    }
    this.selectionChange.emit(Array.from(this.selectedIds));
  }

  toggleAll(): void {
    if (this.allSelected) {
      this.invoices.forEach(i => this.selectedIds.delete(i.facturaId));
    } else {
      this.invoices.forEach(i => this.selectedIds.add(i.facturaId));
    }
    this.selectionChange.emit(Array.from(this.selectedIds));
  }

  // ========= Pagination =========

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.totalItems / this.itemsPerPage));
  }

  get startItem(): number {
    return this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  get endItem(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const pages: number[] = [];
    for (let i = Math.max(1, current - 1); i <= Math.min(total, current + 1); i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.pageChange.emit(page);
    }
  }

  // ========= Helpers =========

  getInitials(name?: string): string {
    if (!name) return '??';
    return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  getAvatarColor(name?: string): string {
    const palette = ['#4285f4', '#ea4335', '#fbbc04', '#34a853', '#ff6d00', '#46bdc6', '#7c4dff', '#e91e63'];
    if (!name) return palette[0];
    const idx = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % palette.length;
    return palette[idx];
  }

  getStatusClass(estado?: string): string {
    switch (estado?.toUpperCase()) {
      case 'APROBADO':  return 'status-approved';
      case 'RECHAZADO': return 'status-rejected';
      default:          return 'status-pending';
    }
  }

  getStatusLabel(estado?: string): string {
    switch (estado?.toUpperCase()) {
      case 'APROBADO':  return 'Aprobado';
      case 'RECHAZADO': return 'Rechazado';
      default:          return 'Pendiente';
    }
  }

  truncateCufe(cufe?: string): string {
    if (!cufe) return '—';
    return cufe.length > 16 ? cufe.slice(0, 16) + '...' : cufe;
  }


  

}
