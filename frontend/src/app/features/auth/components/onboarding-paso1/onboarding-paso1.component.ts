import { Component, Output, EventEmitter } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, FormBuilder, Validators} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { InputComponent } from '../../../../shared/input/input/input.component';

@Component({
  selector: 'app-onboarding-paso1',
  standalone: true,
  imports: [InputComponent, ReactiveFormsModule, RouterLink],
  templateUrl: './onboarding-paso1.component.html',
  styleUrl: './onboarding-paso1.component.css'
})
export class OnboardingPaso1Component {
  onboardingForm: FormGroup;

  @Output() nextStep = new EventEmitter<any>();
  
  constructor(
    private formBuilder: FormBuilder
  ) { 
    this.onboardingForm = this.formBuilder.group({
      companyNombre: new FormControl("", [Validators.required, Validators.minLength(3)]),
      ruc: new FormControl("", [Validators.required, Validators.pattern(/^\d{11}$/)]),
      dv: new FormControl("", [Validators.required, Validators.pattern(/^\d{1,2}$/)])
    });
  }

  setFormData(data: any) {
    if (data) {
      this.onboardingForm.patchValue(data);
    }
  }

  onNext() {
    if (this.onboardingForm.valid) {
      this.nextStep.emit(this.onboardingForm.value);
    } else {
      this.onboardingForm.markAllAsTouched();
    }
  }
}
