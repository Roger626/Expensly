import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceFilterComponent } from './invoice-filter.component';

describe('InvoiceFilterComponent', () => {
  let component: InvoiceFilterComponent;
  let fixture: ComponentFixture<InvoiceFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoiceFilterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvoiceFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
