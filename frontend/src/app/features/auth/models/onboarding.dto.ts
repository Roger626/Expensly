export interface OnboardingData {
    step1: {
        companyNombre: string;
        ruc: string;
        dv: string;
    },
    step2: {
        nombre: string;
        email: string;
        password: string;
    }
}

export interface OnboardingResponse {
    organization: {
        id: string;
        razonSocial: string;
        ruc: string;
        dv: string;
        plan: string | null;
        fechaRegistro: string;
    };
    authData: {
        accessToken: string;
        user: {
            id: string;
            email: string;
            name: string;
            role: string;
            organizationId: string;
        };
    };
}
