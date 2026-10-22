import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { API_URL } from './config';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  if (!req.url.startsWith(API_URL) || req.url.startsWith(`${API_URL}/auth/`)) return next(req);
  //uth endpoints are skipped, so a wrong password on login never triggers a refresh

  const withToken = (token: string | null) =>
    token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(withToken(auth.token())).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) return throwError(() => err);

      return from(auth.refresh()).pipe(
        switchMap((token) => {
          if (token) return next(withToken(token));
          auth.logout();
          return throwError(() => err);
        }),
      );
    }),
  );
};