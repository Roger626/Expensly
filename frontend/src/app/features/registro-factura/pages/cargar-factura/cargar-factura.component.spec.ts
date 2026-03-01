import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CargarFacturaComponent } from './cargar-factura.component';

describe('CargarFacturaComponent', () => {
  let component: CargarFacturaComponent;
  let fixture: ComponentFixture<CargarFacturaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CargarFacturaComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CargarFacturaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
