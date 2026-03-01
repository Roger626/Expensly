import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
    userId: string;
    email: string;
    role: string;
    organizationId: string;
}

/** Extrae el usuario autenticado del token JWT.
 *  Uso: @CurrentUser() user: CurrentUserPayload
 */
export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    },
);
