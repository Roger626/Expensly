import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';
import { Role } from '../models/roles.enum';

// ─── Modelo del payload JWT (debe coincidir con el backend) ────────────────────
export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  organizationId: string;
  iat: number;
  exp: number;
}

// ─── Utilidades JWT ────────────────────────────────────────────────────────────

/**
 * Decodifica el payload del JWT sin verificar la firma.
 * La verificación de firma es responsabilidad exclusiva del backend.
 */
function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as JwtPayload;
  } catch {
    return null;
  }
}

function isTokenExpired(payload: JwtPayload): boolean {
  return Date.now() >= payload.exp * 1000;
}

/**
 * Resuelve la ruta de inicio según el rol del usuario autenticado.
 * Se usa para redirigir a la pantalla correcta cuando el rol no coincide.
 */
function getHomeByRole(role: Role): string {
  switch (role) {
    case Role.SUPERADMIN:
    case Role.CONTADOR:
      return '/admin/facturas';
    case Role.EMPLEADO:
      return '/facturas';
    default:
      return '/auth/login';
  }
}

// ─── Guard factory ─────────────────────────────────────────────────────────────

/**
 * Guard de rol basado en el payload del JWT.
 * Verifica que el usuario autenticado posea uno de los roles permitidos.
 * Si el token está expirado, cierra sesión y redirige al login.
 * Si el rol no coincide, redirige al módulo que le corresponde al usuario.
 *
 * @param allowedRoles - Lista de roles con acceso a la ruta
 *
 * @example
 * // Solo administradores
 * canActivate: [authGuard, roleGuard([Role.SUPERADMIN, Role.CONTADOR])]
 *
 * @example
 * // Solo empleados
 * canActivate: [authGuard, roleGuard([Role.EMPLEADO])]
 */
export const roleGuard = (allowedRoles: Role[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router      = inject(Router);

    const token = authService.getToken();

    if (!token) {
      router.navigate(['/auth/login']);
      return false;
    }

    const payload = decodeJwtPayload(token);

    if (!payload) {
      authService.logout();
      return false;
    }

    if (isTokenExpired(payload)) {
      authService.logout();
      return false;
    }

    if (allowedRoles.includes(payload.role)) {
      return true;
    }

    // El usuario está autenticado pero no tiene el rol requerido.
    // Lo redirigimos a su módulo correspondiente.
    router.navigate([getHomeByRole(payload.role)]);
    return false;
  };
};
