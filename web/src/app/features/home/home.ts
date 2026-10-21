import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-home',
  template: `
    <main class="mx-auto max-w-xl p-6">
      <h1 class="text-2xl font-semibold">Signed in</h1>
      <p class="mt-2 text-slate-600">Role: {{ auth.user()?.role }}</p>
      <button (click)="auth.logout()" class="mt-4 rounded bg-slate-800 px-4 py-2 text-white">Log out</button>
    </main>
  `,
})
export class Home {
  protected readonly auth = inject(AuthService);
}