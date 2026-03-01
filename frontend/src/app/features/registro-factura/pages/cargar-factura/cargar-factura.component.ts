import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CargarArchivoComponent } from '../../components/cargar-facturas/cargar-archivo/cargar-archivo.component';

import { RegistroFacturaService } from '../../services/registro-factura.service';
import { CategoriaDto } from '../../models/categoria.model';
import { ProcesarFacturaResponse, FacturaProcesamientoResult, Factura, CreateFacturaDto } from '../../models/factura.model';
import { FacturaFormComponent } from '../../components/cargar-facturas/factura-form/factura-form.component';
import { QrScannerService } from '../../../../core/services/qr-scanner.service';
import { FacturaViewComponent } from '../../../../shared/factura-view/factura-view.component';
import { ToastService } from '../../../../shared/toast/toast.service';

@Component({
  selector: 'app-cargar-factura',
  standalone: true,
  imports: [CommonModule, CargarArchivoComponent, FacturaFormComponent, FacturaViewComponent],
  templateUrl: './cargar-factura.component.html',
  styleUrl: './cargar-factura.component.css'
})
export class CargarFacturaComponent implements OnInit, OnDestroy {
  @ViewChild(CargarArchivoComponent) cargarArchivoRef!: CargarArchivoComponent;

  resultadoOCR: ProcesarFacturaResponse | null = null;
  isLoading = false;
  isLightboxOpen = false;

  onLightboxChange(open: boolean): void {
    this.isLightboxOpen = open;
  }
  /** Indica si se está guardando la factura en backend */
  isSaving = false;
  /** Mensaje de estado visible al usuario durante el procesamiento */
  loadingMensaje = 'Procesando factura…';
  /** null = sin datos, true = QR detectado, false = no detectado */
  qrDetectado: boolean | null = null;
  errorMensaje: string | null = null;
  categorias: CategoriaDto[] = [];
  imageUrls: string[] = [];

  private subs = new Subscription();

  constructor(
    private registroFacturaService: RegistroFacturaService,
    private qrScannerService: QrScannerService,
    private router: Router,
    private toast: ToastService,
  ) {}

  ngOnInit(): void {
    this.registroFacturaService.cargarCategorias();
    this.subs.add(
      this.registroFacturaService.categorias$.subscribe(cats => this.categorias = cats)
    );
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  /**
   * Flujo de doble verificación:
   * 1. Escanear QR en el browser (Canvas + zxing-wasm) — instantáneo, sin costo.
   * 2. Enviar imágenes + resultado QR al backend.
   * 3. El backend verifica de forma independiente:
   *    - Si coincide → usa el QR para scrapear DGI (sin Azure OCR).
   *    - Si no coincide o no puede leerlo → fallback a Azure OCR.
   */
  async procesarFactura(archivos: File[]): Promise<void> {
    this.isLoading = true;
    this.errorMensaje = null;
    this.resultadoOCR = null;
    this.qrDetectado = null;

    // ── Fase 1: escaneo en el browser (gratis, GPU del usuario) ──────────────
    this.loadingMensaje = 'Buscando código QR…';
    let clientQrData: string | undefined;
    try {
      const qr = await this.qrScannerService.scanFiles(archivos);
      if (qr) {
        clientQrData = qr;
        this.qrDetectado = true;
        this.loadingMensaje = 'QR detectado — verificando con el servidor…';
        console.log('[CargarFactura] QR detectado en cliente:', qr);
      } else {
        this.qrDetectado = false;
        this.loadingMensaje = 'Procesando Factura. Esto puede tardar unos segundos…';
        console.log('[CargarFactura] Sin QR en cliente → el backend usuara IA.');
      }
    } catch (err) {
      // El escaneo QR es opcional — si falla, continuar sin él
      console.warn('[CargarFactura] Error en escaneo QR del cliente:', err);
    }

    // ── Fase 2: enviar al backend con el clientQrData (si lo hay) ────────────
    this.registroFacturaService.subirArchivos(archivos, clientQrData).subscribe({
      next: (response: ProcesarFacturaResponse) => {
        this.resultadoOCR = response;
        // Usar el array de objetos 'imagenes' (nuevo formato)
        if (response.data.imagenes && response.data.imagenes.length > 0) {
            this.imageUrls = response.data.imagenes
                .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
                .map(img => img.url);
        } else {
            // Fallback para respuestas antiguas
            this.imageUrls = response.data.imageUrls?.length
                ? response.data.imageUrls
                : (response.data.urlImagen ? [response.data.urlImagen] : []);
        }
        this.isLoading = false;
        this.toast.info(
          'Datos extraídos',
          'Revisa y confirma la información detectada antes de guardar.',
        );
      },
      error: (error) => {
        console.error('Error al procesar la factura:', error);
        const msg = error?.error?.message ?? 'Error al procesar la factura. Intente nuevamente.';
        this.errorMensaje = msg;
        this.isLoading = false;
        this.toast.error('Error al procesar', msg);
      }
    });
  }

  guardarFactura(invoice: ProcesarFacturaResponse): void {
    this.registroFacturaService.setFacturaData(invoice);
  }

  limpiarEstadoPadre() {
    this.resultadoOCR = null;
    this.errorMensaje = null;
    this.qrDetectado = null;
    this.imageUrls = [];
    this.cargarArchivoRef?.reset();
    this.registroFacturaService.clearFacturaData();
  }

  createFactura(dto: CreateFacturaDto): void {
    if (this.isSaving) return;
    this.isSaving = true;

    this.registroFacturaService.createFactura(dto).subscribe({
      next: () => {
        this.isSaving = false;
        this.toast.success(
          'Factura registrada',
          'La factura se guardó correctamente.',
        );
      },
      error: (error) => {
        console.error('Error al crear la factura:', error);
        const msg = error?.error?.message ?? 'Error al guardar la factura. Intente nuevamente.';
        this.errorMensaje = msg;
        this.isSaving = false;
        this.toast.error('No se pudo guardar', msg);
      }
    });
  }
}
