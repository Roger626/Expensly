import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ImagenPreview {
  file: File;
  preview: string;
}

@Component({
  selector: 'app-cargar-archivo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cargar-archivo.component.html',
  styleUrl: './cargar-archivo.component.css'
})
export class CargarArchivoComponent {
  @Output() enviarArchivos = new EventEmitter<File[]>();
  @Output() archivosDescartados = new EventEmitter<void>();

  imagenes: ImagenPreview[] = [];
  isDragging = false;

  readonly MAX_FILES = 10;
  readonly MAX_SIZE  = 5 * 1024 * 1024; // 5 MB por imagen

  get hasFiles(): boolean { return this.imagenes.length > 0; }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) this.processFiles(Array.from(input.files));
    input.value = '';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    if (event.dataTransfer?.files) {
      this.processFiles(Array.from(event.dataTransfer.files));
    }
  }

  private processFiles(files: File[]) {
    const disponibles = this.MAX_FILES - this.imagenes.length;
    const aAgregar   = files.slice(0, disponibles);

    for (const file of aAgregar) {
      if (!file.type.startsWith('image/')) {
        alert(`"${file.name}" no es una imagen valida.`);
        continue;
      }
      if (file.size > this.MAX_SIZE) {
        alert(`"${file.name}" supera los 5 MB permitidos.`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        this.imagenes.push({ file, preview: reader.result as string });
      };
      reader.readAsDataURL(file);
    }

    if (files.length > disponibles) {
      alert(`Solo se pueden subir ${this.MAX_FILES} imagenes por factura. Se ignoraron las extras.`);
    }
  }

  removeImagen(index: number) {
    this.imagenes.splice(index, 1);
  }

  onDiscard() {
    this.imagenes = [];
    this.archivosDescartados.emit();
  }

  /** Limpieza programática desde el padre (post-guardado) */
  reset() {
    this.imagenes = [];
    this.isDragging = false;
  }

  onUpload() {
    if (this.hasFiles) {
      this.enviarArchivos.emit(this.imagenes.map(i => i.file));
    }
  }
}
