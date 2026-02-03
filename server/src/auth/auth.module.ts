import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { DevLoginStrategy } from './strategies/dev-login.strategy';
import { PasswordService } from './password.service';
import { PasswordResetService } from './password-reset.service';
import { StorageModule } from '../common/storage/storage.module';
import session from 'express-session';
import { StorageService } from '../common/storage/storage.service';
import { logger } from '../../lib/logger';

// Déterminer le mode d'authentification (local uniquement)
const authMode = 'local';
const devLoginEnabled = process.env.ENABLE_DEV_LOGIN === 'true' && process.env.NODE_ENV !== 'production';

logger.info('[AuthModule] Mode authentification: LOCAL (@robinswood/auth-unified)');
if (devLoginEnabled) {
  logger.warn('[AuthModule] ⚠️  DEV LOGIN ENABLED - Password bypass active for development');
}

@Module({
  imports: [
    PassportModule.register({
      session: true,
    }),
    StorageModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    PasswordResetService,
    LocalStrategy,
    // Charger DevLoginStrategy si activé (dev uniquement)
    ...(devLoginEnabled ? [DevLoginStrategy] : []),
    {
      provide: 'SESSION_CONFIG',
      useFactory: (storageService: StorageService) => {
        const sessionSettings: session.SessionOptions = {
          secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
          resave: false,
          saveUninitialized: false,
          store: storageService.sessionStore,
          rolling: true,
          cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            sameSite: 'lax', // Nécessaire pour PATCH/POST requests
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            // Set domain for cross-subdomain cookies (important for Traefik routing)
            // In dev/test, this allows https://cjd80.rbw.ovh to access cookies
            domain: process.env.NODE_ENV === 'production'
              ? '.cjd80.local' // Production domain
              : '.rbw.ovh',    // Dev/test domain for .rbw.ovh
            path: '/',
          },
        };
        return sessionSettings;
      },
      inject: [StorageService],
    },
    {
      provide: 'AUTH_MODE',
      useValue: 'local',
    },
  ],
  exports: [AuthService, PasswordService, PasswordResetService, PassportModule, 'SESSION_CONFIG', 'AUTH_MODE'],
})
export class AuthModule {}
