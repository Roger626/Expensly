import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OnboardingPaso2Component } from './onboarding-paso2.component';

describe('OnboardingPaso2Component', () => {
  let component: OnboardingPaso2Component;
  let fixture: ComponentFixture<OnboardingPaso2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnboardingPaso2Component]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OnboardingPaso2Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
