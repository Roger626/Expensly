import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-export-excel-csv',
  standalone: true,
  imports: [],
  templateUrl: './export-excel-csv.component.html',
  styleUrl: './export-excel-csv.component.css'
})
export class ExportExcelCsvComponent {
  @Output() exportExcel = new EventEmitter<void>();
  
}
