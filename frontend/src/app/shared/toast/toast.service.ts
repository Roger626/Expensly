import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  durationMs: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _counter = 0;
  private readonly _toasts$ = new BehaviorSubject<Toast[]>([]);
  readonly toasts$ = this._toasts$.asObservable();

  success(title: string, message?: string, durationMs = 4000): void {
    this._push({ type: 'success', title, message }, durationMs);
  }

  error(title: string, message?: string, durationMs = 6000): void {
    this._push({ type: 'error', title, message }, durationMs);
  }

  warning(title: string, message?: string, durationMs = 5000): void {
    this._push({ type: 'warning', title, message }, durationMs);
  }

  info(title: string, message?: string, durationMs = 4000): void {
    this._push({ type: 'info', title, message }, durationMs);
  }

  dismiss(id: number): void {
    this._toasts$.next(this._toasts$.getValue().filter(t => t.id !== id));
  }

  private _push(partial: Omit<Toast, 'id' | 'durationMs'>, durationMs: number): void {
    const id    = ++this._counter;
    const toast: Toast = { id, durationMs, ...partial };
    this._toasts$.next([...this._toasts$.getValue(), toast]);
    setTimeout(() => this.dismiss(id), durationMs);
  }
}
