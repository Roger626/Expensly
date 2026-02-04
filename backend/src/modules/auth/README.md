# Módulo de Autenticación - Expensly

Este módulo implementa la autenticación completa del sistema Expensly siguiendo los principios SOLID y el patrón Repository.

## Arquitectura

### Estructura de Directorios

```
auth/
├── controllers/          # Capa de presentación (HTTP)
│   └── auth.controller.ts
├── services/            # Lógica de negocio
│   ├── auth.service.ts
│   └── onboarding.service.ts
├── repositories/        # Capa de acceso a datos
│   └── auth.repository.ts
├── interfaces/          # Contratos e interfaces
│   └── iauth.repository.ts
├── dto/                 # Data Transfer Objects
│   ├── login.dto.ts
│   ├── register-user.dto.ts
│   └── onboarding-company.dto.ts
├── guards/              # Protección de rutas
│   └── jwt.guard.ts
├── strategies/          # Estrategias de autenticación
│   └── jwt.strategy.ts
├── entities/            # Tipos y entidades
│   └── index.ts
└── auth.module.ts       # Configuración del módulo
```

## Principios SOLID Aplicados

### 1. Single Responsibility Principle (SRP)
- **AuthService**: Maneja solo la lógica de autenticación (login, registro, validación)
- **OnboardingService**: Gestiona únicamente el proceso de onboarding de empresas
- **AuthRepository**: Responsable solo del acceso a datos
- **AuthController**: Solo maneja las peticiones HTTP

### 2. Open/Closed Principle (OCP)
- Uso de interfaces (`IAuthRepository`) permite extender funcionalidad sin modificar código existente
- Nuevas estrategias de autenticación pueden agregarse sin cambiar el código base

### 3. Liskov Substitution Principle (LSP)
- `AuthRepository` puede ser sustituido por cualquier implementación de `IAuthRepository`
- Facilita testing con mocks

### 4. Interface Segregation Principle (ISP)
- Interfaces específicas y cohesivas
- `IAuthRepository` contiene solo métodos relacionados con autenticación

### 5. Dependency Inversion Principle (DIP)
- Los servicios dependen de abstracciones (`IAuthRepository`), no de implementaciones concretas
- Inyección de dependencias usando tokens de NestJS

## Endpoints Disponibles

### Onboarding
- `POST /auth/onboarding` - Registro completo de empresa y administrador

### Autenticación
- `POST /auth/register` - Registro de nuevo usuario
- `POST /auth/login` - Inicio de sesión
- `POST /auth/logout` - Cierre de sesión (requiere autenticación)

### Gestión de Usuario
- `GET /auth/me` - Obtener perfil del usuario autenticado (requiere autenticación)
- `PATCH /auth/change-password` - Cambiar contraseña (requiere autenticación)
- `DELETE /auth/deactivate/:userId` - Desactivar usuario (requiere autenticación)

### Validaciones
- `GET /auth/validate-ruc/:ruc` - Validar disponibilidad de RUC
- `GET /auth/organization/:id` - Obtener información de organización (requiere autenticación)

## Flujos de Trabajo

### Flujo de Onboarding
1. Cliente envía datos de empresa y administrador
2. OnboardingService valida que el RUC no exista
3. Se crea la organización en la base de datos
4. Se crea el usuario administrador (rol: CONTADOR)
5. AuthService genera token JWT
6. Se crea sesión en la base de datos
7. Se retorna token y datos de usuario/empresa

### Flujo de Login
1. Cliente envía email, password y rol
2. AuthService busca usuario por email
3. Valida que el usuario esté activo
4. Verifica que el rol coincida
5. Compara password con hash almacenado
6. Genera token JWT
7. Elimina sesiones anteriores
8. Crea nueva sesión
9. Retorna token y datos de usuario

### Flujo de Registro de Usuario
1. Cliente envía datos de nuevo usuario
2. AuthService valida que la organización exista
3. Valida que el email no esté en uso
4. Hash de la contraseña usando bcrypt
5. Crea usuario en la base de datos
6. Genera token JWT
7. Crea sesión
8. Retorna token y datos de usuario

## Seguridad

### Hash de Contraseñas
- Uso de **bcrypt** con 10 rounds de salt
- Las contraseñas nunca se almacenan en texto plano

### JWT (JSON Web Tokens)
- Tokens firmados con secreto del servidor
- Payload incluye: userId, email, role, organizationId
- Expiración configurable (por defecto: 1 día)

### Guards
- `JwtAuthGuard` protege rutas que requieren autenticación
- Verifica validez del token en cada petición
- Extrae datos del usuario del token

### Sesiones
- Cada login crea una sesión en BD
- Token único por sesión (UUID v4)
- Las sesiones expiran automáticamente
- Al cambiar contraseña, todas las sesiones se invalidan

## Variables de Entorno Requeridas

```env
DATABASE_URL="postgresql://user:password@localhost:5432/expensly"
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRATION="1d"  # Opcional, por defecto 1 día
```

## Dependencias

### Producción
- `@nestjs/jwt` - Manejo de JWT
- `@nestjs/passport` - Framework de autenticación
- `passport-jwt` - Estrategia JWT para Passport
- `bcrypt` - Hash de contraseñas
- `uuid` - Generación de IDs únicos para sesiones
- `class-validator` - Validación de DTOs
- `class-transformer` - Transformación de objetos

### Desarrollo
- `@types/bcrypt`
- `@types/uuid`
- `@types/passport-jwt`

## Testing

### Ejemplo de Test Unitario (AuthService)

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let repository: IAuthRepository;

  beforeEach(async () => {
    const mockRepository = {
      findUserByEmail: jest.fn(),
      createUser: jest.fn(),
      // ... otros métodos
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'IAuthRepository', useValue: mockRepository },
        // ... otros providers
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    repository = module.get<IAuthRepository>('IAuthRepository');
  });

  it('should register a new user', async () => {
    // Test implementation
  });
});
```

## Próximas Mejoras

1. **Refresh Tokens**: Implementar tokens de refresco para mejorar seguridad
2. **2FA**: Autenticación de dos factores
3. **OAuth**: Integración con Google, GitHub, etc.
4. **Rate Limiting**: Protección contra fuerza bruta
5. **Password Recovery**: Flujo de recuperación de contraseña
6. **Email Verification**: Verificación de correo electrónico
7. **Auditoría**: Registro detallado de intentos de login

## Autor

Desarrollado siguiendo las mejores prácticas de NestJS y arquitectura hexagonal.
