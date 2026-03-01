import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Factura } from '../../models/factura.model';

@Component({
  selector: 'app-factura-card-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './factura-card-table.component.html',
  styleUrl: './factura-card-table.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FacturaCardTableComponent {
  @Input() facturas: Factura[] = [];
  @Input() totalItems = 0;
  @Input() itemsPerPage = 10;
  @Input() currentPage = 1;

  @Output() pageChange   = new EventEmitter<number>();
  @Output() openFactura  = new EventEmitter<Factura>();

  // ── Pagination helpers ────────────────────────────────────────────────────

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
    const total   = this.totalPages;
    const current = this.currentPage;
    const pages: number[] = [];
    for (let i = Math.max(1, current - 1); i <= Math.min(total, current + 1); i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.pageChange.emit(page);
    }
  }

  // ── Visual helpers ────────────────────────────────────────────────────────

  getStatusClass(estado?: string): string {
    switch (estado) {
      case 'APROBADO':  return 'status-approved';
      case 'RECHAZADO': return 'status-rejected';
      default:          return 'status-pending';
    }
  }

  getStatusLabel(estado?: string): string {
    switch (estado) {
      case 'APROBADO':  return 'Aprobada';
      case 'RECHAZADO': return 'Rechazada';
      default:          return 'Pendiente';
    }
  }

  getInitials(proveedor: string): string {
    return proveedor
      .split(' ')
      .slice(0, 2)
      .map(w => w[0] ?? '')
      .join('')
      .toUpperCase();
  }

  getAvatarColor(name: string): string {
    const palette = [
      '#4f46e5', '#7c3aed', '#db2777', '#ea580c',
      '#16a34a', '#0891b2', '#d97706', '#dc2626',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) { hash = name.charCodeAt(i) + (hash << 5) - hash; }
    return palette[Math.abs(hash) % palette.length];
  }
}
