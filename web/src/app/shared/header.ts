import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="flex items-center justify-between">
      <nav class="flex gap-4 text-sm">
        <a
          routerLink="/"
          routerLinkActive="font-semibold text-indigo-600"
          [routerLinkActiveOptions]="{ exact: true }"
          >My leave</a
        >
        @if (auth.isManager()) {
          <a routerLink="/approvals" routerLinkActive="font-semibold text-indigo-600">Approvals</a>
        }
      </nav>
      <div class="flex flex-col items-end gap-1">
        <span class="text-sm font-medium text-slate-700">{{ auth.user()?.name }}</span>
        <button (click)="auth.logout()" class="text-sm text-slate-600 underline">Log out</button>
      </div>
    </header>
  `,
})
export class Header {
  protected readonly auth = inject(AuthService);
}