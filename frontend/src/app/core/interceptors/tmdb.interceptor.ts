import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '@environments/environment';

export const tmdbInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes('api.themoviedb.org')) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${environment.tmdbApiKey}`,
      accept: 'application/json'
    }
  });

  return next(authReq);
};