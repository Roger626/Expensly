import { Component, EventEmitter, Output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../features/auth/services/auth.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class NavbarComponent {

  @Output() logout = new EventEmitter<void>();

  private readonly authService = inject(AuthService);

  /** Nombre del usuario autenticado para mostrarlo en la barra. */
  protected readonly userName = this.authService.currentUser()?.name ?? '';

  onLogout(): void {
    this.logout.emit();
  }
}
