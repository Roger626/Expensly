import { Observable } from 'rxjs';
import { UsuarioTabla, RolBackend } from '../models/usuario.model';

export interface IAdminUsuariosService {
  readonly usuarios$:      Observable<UsuarioTabla[]>;
  readonly isLoading$:     Observable<boolean>;
  readonly error$:         Observable<string | null>;
  readonly isInviting$:    Observable<boolean>;
  readonly inviteSuccess$: Observable<boolean>;

  loadAll(): void;
  inviteUser(email: string, rol: RolBackend, nombre?: string): void;
  resetInviteState(): void;
  setUserStatus(userId: string, activo: boolean): void;
  updateUserRole(userId: string, rol: RolBackend): void;
  deleteUser(userId: string): void;
}
