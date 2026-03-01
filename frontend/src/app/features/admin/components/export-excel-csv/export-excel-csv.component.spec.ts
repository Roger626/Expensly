import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExportExcelCsvComponent } from './export-excel-csv.component';

describe('ExportExcelCsvComponent', () => {
  let component: ExportExcelCsvComponent;
  let fixture: ComponentFixture<ExportExcelCsvComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportExcelCsvComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExportExcelCsvComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
