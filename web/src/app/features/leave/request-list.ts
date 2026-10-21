import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, output, signal } from '@angular/core';
import { errorMessage } from '../../core/errors';
import { LeaveService } from '../../core/leave.service';
import { LeaveRequest, LeaveStatus } from '../../core/models';

@Component({
  selector: 'app-request-list',
  template: `
    <section class="rounded-xl bg-white p-4 shadow">
      <h2 class="mb-3 font-medium">My requests</h2>

      @if (error(); as message) {
        <p class="mb-2 text-sm text-red-600" role="alert">{{ message }}</p>
      }

      @for (r of requests(); track r.id) {
        <article class="flex items-center justify-between gap-3 border-t border-slate-100 py-3 first:border-t-0">
          <div>
            <p class="text-sm font-medium capitalize">{{ r.type }}</p>
            <p class="text-sm text-slate-600">{{ r.startDate }} → {{ r.endDate }}</p>
          </div>
          <div class="flex items-center gap-3">
            <span [class]="badge[r.status]" class="rounded-full px-2 py-0.5 text-xs font-medium capitalize">
              {{ r.status }}
            </span>
            @if (r.status === 'pending') {
              <button (click)="cancel(r.id)" class="text-sm text-red-600 underline">Cancel</button>
            }
          </div>
        </article>
      } @empty {
        <p class="text-sm text-slate-500">No requests yet.</p>
      }
    </section>
  `,
})
export class RequestList {
  private readonly leave = inject(LeaveService);

  readonly requests = input.required<LeaveRequest[]>();
  readonly cancelled = output();

  protected readonly error = signal<string | null>(null);
  protected readonly badge: Record<LeaveStatus, string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-slate-100 text-slate-600',
  };

  protected cancel(id: string) {
    this.error.set(null);
    this.leave.cancel(id).subscribe({
      next: () => this.cancelled.emit(),
      error: (err: HttpErrorResponse) => this.error.set(errorMessage(err)),
    });
  }
}