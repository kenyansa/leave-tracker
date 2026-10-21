import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { API_URL } from './config';
import { JwtPayload } from './models';

const TOKEN_KEY = 'access_token';

function decode(token: string | null): JwtPayload | null {
  if (!token) return null;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64)) as JwtPayload;
    return payload.exp * 1000 > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenState = signal(localStorage.getItem(TOKEN_KEY));

  readonly token = this.tokenState.asReadonly();
  readonly user = computed(() => decode(this.tokenState()));
  readonly isLoggedIn = computed(() => this.user() !== null);
  readonly isManager = computed(() => this.user()?.role === 'manager');

  login(email: string, password: string) {
    return this.http
      .post<{ accessToken: string }>(`${API_URL}/auth/login`, { email, password })
      .pipe(tap(({ accessToken }) => this.setToken(accessToken)));
  }

  logout() {
    this.setToken(null);
    void this.router.navigateByUrl('/login');
  }

  private setToken(token: string | null) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    this.tokenState.set(token);
  }
}