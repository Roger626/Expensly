import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsuarioTabla } from '../../models/usuario.model';

export interface MenuAccionEvent {
  accion: 'activar' | 'desactivar' | 'cambiar-rol' | 'eliminar';
  usuario: UsuarioTabla;
}

@Component({
  selector: 'app-user-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-table.component.html',
  styleUrl: './user-table.component.css',
})
export class UserTableComponent {

  // ── Inputs ────────────────────────────────────────────────────────────────
  @Input() usuarios:      UsuarioTabla[] = [];
  @Input() totalCount:    number         = 0;
  @Input() paginaActual:  number         = 1;
  @Input() itemsPorPagina: number        = 4;

  // ── Outputs ───────────────────────────────────────────────────────────────
  @Output() pageChange  = new EventEmitter<number>();
  @Output() menuAccion  = new EventEmitter<MenuAccionEvent>();

  // ── Estado interno — dropdown ─────────────────────────────────────────────
  menuAbiertoId: string | null = null;

  // ── Cierra el dropdown al hacer click fuera ───────────────────────────────
  @HostListener('document:click')
  onDocumentClick(): void {
    this.menuAbiertoId = null;
  }

  toggleMenu(id: string, event: MouseEvent): void {
    event.stopPropagation();
    this.menuAbiertoId = this.menuAbiertoId === id ? null : id;
  }

  // ── Paginación ────────────────────────────────────────────────────────────
  get totalPaginas(): number {
    return Math.ceil(this.totalCount / this.itemsPorPagina);
  }

  get paginas(): number[] {
    return Array.from({ length: this.totalPaginas }, (_, i) => i + 1);
  }

  get primerItem(): number {
    return this.totalCount === 0 ? 0 : (this.paginaActual - 1) * this.itemsPorPagina + 1;
  }

  get ultimoItem(): number {
    return Math.min(this.paginaActual * this.itemsPorPagina, this.totalCount);
  }

  irPagina(p: number): void {
    if (p >= 1 && p <= this.totalPaginas && p !== this.paginaActual) {
      this.pageChange.emit(p);
    }
  }

  // ── Acciones ──────────────────────────────────────────────────────────────
  dispatchAccion(accion: MenuAccionEvent['accion'], usuario: UsuarioTabla, event: MouseEvent): void {
    event.stopPropagation();
    this.menuAbiertoId = null;
    this.menuAccion.emit({ accion, usuario });
  }
}
