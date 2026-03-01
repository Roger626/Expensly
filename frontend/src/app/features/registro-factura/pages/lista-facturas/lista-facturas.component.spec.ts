import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaFacturasComponent } from './lista-facturas.component';

describe('ListaFacturasComponent', () => {
  let component: ListaFacturasComponent;
  let fixture: ComponentFixture<ListaFacturasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaFacturasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListaFacturasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
