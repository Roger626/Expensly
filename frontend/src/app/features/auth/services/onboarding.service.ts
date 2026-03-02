import { Injectable } from '@angular/core';
import { OnboardingData, OnboardingResponse } from '../models/onboarding.dto';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class OnboardingService {
    private onboardingDataSubject = new BehaviorSubject<OnboardingData>({
        step1: {
            companyNombre: '',
            ruc: '',
            dv: ''
        },
        step2: {
            nombre: '',
            email: '',
            password: ''
        }
    });
    onboardingData$ = this.onboardingDataSubject.asObservable();
    private apiUrl = `${environment.apiUrl}/auth/onboarding`;

    constructor(private http: HttpClient){}

    getCurrentData(): OnboardingData {
        return this.onboardingDataSubject.value;
    }

    updateData(data: Partial<OnboardingData>, step: number) {
    const current = this.onboardingDataSubject.value;
    const stepKey = `step${step}` as keyof OnboardingData; // Esto lo hace dinámico

    this.onboardingDataSubject.next({
        ...current,
        [stepKey]: { ...current[stepKey], ...data[stepKey] }
    });
}

    submitOnboardingData(): Observable<OnboardingResponse> {
        const { step1, step2 } = this.onboardingDataSubject.value;

        const payload = {
            company: {
                razonSocial: step1.companyNombre,
                ruc: step1.ruc,
                dv: step1.dv,
            },
            admin: {
                name: step2.nombre,
                email: step2.email,
                password: step2.password,
            }
        };

        return this.http.post<OnboardingResponse>(this.apiUrl, payload);
    }
       
}
