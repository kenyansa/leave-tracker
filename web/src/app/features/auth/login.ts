import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  template: `
    <main class="grid min-h-screen place-items-center bg-slate-50 p-4">
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        class="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow"
      >
        <h1 class="text-xl font-semibold">Leave Tracker</h1>

        <label class="block text-sm">
          Email
          <input
            formControlName="email"
            type="email"
            autocomplete="username"
            class="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>

        <label class="block text-sm">
          Password
          <input
            formControlName="password"
            type="password"
            autocomplete="current-password"
            class="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>

        @if (error(); as message) {
          <p class="text-sm text-red-600" role="alert">{{ message }}</p>
        }

        <button
          type="submit"
          [disabled]="form.invalid || loading()"
          class="w-full rounded bg-indigo-600 py-2 font-medium text-white disabled:opacity-50"
        >
          {{ loading() ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>
    </main>
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);

    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: (err: HttpErrorResponse) => {
        this.error.set(err.status === 401 ? 'Invalid email or password' : 'Something went wrong, try again');
        this.loading.set(false);
      },
    });
  }
}