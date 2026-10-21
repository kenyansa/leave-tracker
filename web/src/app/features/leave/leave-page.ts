import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { LeaveService } from '../../core/leave.service';
import { BalanceCard } from './balance-card';
import { RequestForm } from './request-form';
import { RequestList } from './request-list';
import { Header } from '../../shared/header';

@Component({
  selector: 'app-leave-page',
  imports: [BalanceCard, RequestForm, RequestList, Header],
  template: `
    <main class="mx-auto max-w-3xl space-y-6 p-4">
      <app-header />
      <h1 class="text-2xl font-semibold">My leave</h1>

      <app-balance-card [balances]="balances()" [(year)]="year" />
      <app-request-form (created)="reload()" />
      <app-request-list [requests]="requests()" (cancelled)="reload()" />
    </main>
  `,
})
export class LeavePage {
  private readonly leave = inject(LeaveService);
  private readonly version = signal(0);

  protected readonly year = signal(new Date().getFullYear());

  protected readonly requests = toSignal(
    toObservable(this.version).pipe(switchMap(() => this.leave.mine())),
    { initialValue: [] },
  );

  protected readonly balances = toSignal(
    toObservable(computed(() => ({ year: this.year(), version: this.version() }))).pipe(
      switchMap(({ year }) => this.leave.balance(year)),
    ),
    { initialValue: [] },
  );

  protected reload() {
    this.version.update((n) => n + 1);
  }
}