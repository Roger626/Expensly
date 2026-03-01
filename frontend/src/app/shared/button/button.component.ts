import { Component,Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button.component.html',
  styleUrl: './button.component.css'
})
export class ButtonComponent {
  @Input() label = 'Button';
  @Input() color = "#007bff";
  @Input() disabled = false;
  @Output() click = new EventEmitter<void>();

  onClick(): void {
    this.click.emit();

  }

}
