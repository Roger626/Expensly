import { Routes } from '@angular/router';
import { FacturasComponent } from './pages/facturas/facturas.component';
import { CargarFacturaComponent } from '../registro-factura/pages/cargar-factura/cargar-factura.component';
import { UsuariosComponent } from './pages/usuarios/usuarios.component';

export const adminRoutes: Routes = [
    { path: 'facturas',       component: FacturasComponent },
    { path: 'facturas/crear', component: CargarFacturaComponent },
    { path: 'usuarios',       component: UsuariosComponent },
]
