import { ApplicationConfig, provideBrowserGlobalErrorListeners, LOCALE_ID } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { tmdbInterceptor } from '@core/interceptors/tmdb.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'fr-FR' },
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([tmdbInterceptor]))
  ]
};
