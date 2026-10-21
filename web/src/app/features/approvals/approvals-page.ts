import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { finalize, switchMap } from 'rxjs';
import { errorMessage } from '../../core/errors';
import { LeaveService } from '../../core/leave.service';
import { Decision, PendingLeave } from '../../core/models';
import { Header } from '../../shared/header';

@Component({
  selector: 'app-approvals-page',
  imports: [Header],
  template: `
    <main class="mx-auto max-w-3xl space-y-6 p-4">
      <app-header />
      <h1 class="text-2xl font-semibold">Pending approvals</h1>

      @if (error(); as message) {
        <p class="text-sm text-red-600" role="alert">{{ message }}</p>
      }

      <section class="rounded-xl bg-white p-4 shadow">
        @for (r of requests(); track r.id) {
          <article class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 py-3 first:border-t-0">
            <div>
              <p class="text-sm font-medium">
                {{ r.user.name }}
                <span class="font-normal capitalize text-slate-500">· {{ r.type }}</span>
              </p>
              <p class="text-sm text-slate-600">{{ r.startDate }} → {{ r.endDate }} ({{ days(r) }} days)</p>
              @if (r.reason) {
                <p class="mt-1 text-sm text-slate-500">{{ r.reason }}</p>
              }
            </div>
            <div class="flex gap-2">
              <button
                (click)="decide(r.id, 'reject')"
                [disabled]="busyId() === r.id"
                class="rounded border border-red-300 px-3 py-1 text-sm text-red-700 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                (click)="decide(r.id, 'approve')"
                [disabled]="busyId() === r.id"
                class="rounded bg-green-600 px-3 py-1 text-sm text-white disabled:opacity-50"
              >
                Approve
              </button>
            </div>
          </article>
        } @empty {
          <p class="text-sm text-slate-500">Nothing waiting for you.</p>
        }
      </section>
    </main>
  `,
})
export class ApprovalsPage {
  private readonly leave = inject(LeaveService);
  private readonly version = signal(0);

  protected readonly busyId = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly requests = toSignal(
    toObservable(this.version).pipe(switchMap(() => this.leave.pending())),
    { initialValue: [] },
  );

  protected days({ startDate, endDate }: PendingLeave) {
    return (Date.parse(endDate) - Date.parse(startDate)) / 86_400_000 + 1;
  }

  protected decide(id: string, decision: Decision) {
    this.busyId.set(id);
    this.error.set(null);

    this.leave
      .decide(id, decision)
      .pipe(
        finalize(() => {
          this.busyId.set(null);
          this.version.update((n) => n + 1);
        }),
      )
      .subscribe({ error: (err: HttpErrorResponse) => this.error.set(errorMessage(err)) });
  }
}