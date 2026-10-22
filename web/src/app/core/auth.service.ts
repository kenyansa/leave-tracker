import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, EMPTY, firstValueFrom, tap } from 'rxjs';
import { API_URL } from './config';
import { JwtPayload } from './models';

interface TokenResponse {
  accessToken: string;
}

const withCookies = { withCredentials: true };

function decode(token: string | null): JwtPayload | null {
  if (!token) return null;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as JwtPayload;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenState = signal<string | null>(null);
  private pendingRefresh: Promise<string | null> | null = null;

  readonly token = this.tokenState.asReadonly();
  readonly user = computed(() => decode(this.tokenState()));
  readonly isLoggedIn = computed(() => this.user() !== null);
  readonly isManager = computed(() => this.user()?.role === 'manager');

  login(email: string, password: string) {
    return this.http
      .post<TokenResponse>(`${API_URL}/auth/login`, { email, password }, withCookies)
      .pipe(tap(({ accessToken }) => this.tokenState.set(accessToken)));
  }

    refresh() {
    this.pendingRefresh ??= this.requestToken().then((token) => {
      this.tokenState.set(token);
      this.pendingRefresh = null;
      return token;
    });
    return this.pendingRefresh;
  }

  private async requestToken(): Promise<string | null> {
    try {
      return await navigator.locks.request('auth-refresh', async () => {
        const { accessToken } = await firstValueFrom(
          this.http.post<TokenResponse>(`${API_URL}/auth/refresh`, {}, withCookies),
        );
        return accessToken;
      });
    } catch {
      return null;
    }
  }

  logout() {
    this.http
      .post(`${API_URL}/auth/logout`, {}, withCookies)
      .pipe(catchError(() => EMPTY))
      .subscribe();
    this.tokenState.set(null);
    void this.router.navigateByUrl('/login');
  }
}