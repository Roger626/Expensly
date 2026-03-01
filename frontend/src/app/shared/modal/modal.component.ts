import {
  Component, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export type ModalVariant = 'default' | 'danger' | 'warning' | 'success' | 'info';
export type ModalSize    = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css',
})
export class ModalComponent implements OnChanges {
  /** Controla la visibilidad del modal. */
  @Input() visible   = false;
  /** Texto principal del header. */
  @Input() title     = '';
  /** Texto secundario bajo el título. */
  @Input() subtitle  = '';
  /**
   * Variante de color: define el icono por defecto y el acento del header.
   * Puedes sobreescribir el icono con el slot [modal-icon].
   */
  @Input() variant: ModalVariant = 'default';
  /** Ancho máximo del panel: sm=380px  md=480px  lg=620px */
  @Input() size: ModalSize = 'md';
  /** Si true, el clic en el backdrop NO cierra el modal. */
  @Input() blockBackdrop = false;

  @Output() closed = new EventEmitter<void>();

  /** Escala de entrada / salida para la animación. */
  protected animating = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.animating = true;
    }
  }

  onBackdropClick(): void {
    if (!this.blockBackdrop) this.close();
  }

  close(): void {
    this.closed.emit();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visible && !this.blockBackdrop) this.close();
  }
}
