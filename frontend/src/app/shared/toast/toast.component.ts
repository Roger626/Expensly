import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Toast, ToastService } from './toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
})
export class ToastComponent {
  protected readonly toastService = inject(ToastService);
  protected readonly toasts$ = this.toastService.toasts$;

  trackById(_: number, t: Toast): number {
    return t.id;
  }

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }
}
