import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Décorateur pour récupérer l'utilisateur depuis la requête
 * Usage: @User() user ou @User('email') email
 */
export const User = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp()?.getRequest?.() as
      | { user?: unknown }
      | undefined;
    const user = request?.user;

    if (!data) {
      return user;
    }

    if (!user || typeof user !== 'object') {
      return undefined;
    }

    return (user as Record<string, unknown>)[data];
  },
);
