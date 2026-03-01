import { Routes } from '@angular/router';
import { ListaFacturasComponent } from './pages/lista-facturas/lista-facturas.component';
import { CargarFacturaComponent } from './pages/cargar-factura/cargar-factura.component';

export const registroFacturaRoutes: Routes = [
    { path: '', component: ListaFacturasComponent },
    { path: 'crear', component: CargarFacturaComponent },
    //{ path: ':id', component: SelectedFacturaComponent },
];
