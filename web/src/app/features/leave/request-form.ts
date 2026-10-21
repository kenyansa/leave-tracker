import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, output, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { errorMessage } from '../../core/errors';
import { LeaveService } from '../../core/leave.service';
import { LEAVE_TYPES, LeaveType } from '../../core/models';

@Component({
  selector: 'app-request-form',
  imports: [ReactiveFormsModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4 rounded-xl bg-white p-4 shadow">
      <h2 class="font-medium">Request leave</h2>

      <div class="grid gap-3 sm:grid-cols-3">
        <label class="text-sm">
          Type
          <select formControlName="type" [class]="field">
            @for (t of types; track t) {
              <option [value]="t">{{ t }}</option>
            }
          </select>
        </label>
        <label class="text-sm">
          From
          <input formControlName="startDate" type="date" [class]="field" />
        </label>
        <label class="text-sm">
          To
          <input formControlName="endDate" type="date" [min]="form.controls.startDate.value" [class]="field" />
        </label>
      </div>

      <label class="block text-sm">
        Reason (optional)
        <textarea formControlName="reason" rows="2" maxlength="500" [class]="field"></textarea>
      </label>

      @if (error(); as message) {
        <p class="text-sm text-red-600" role="alert">{{ message }}</p>
      }

      <button
        type="submit"
        [disabled]="form.invalid || submitting()"
        class="rounded bg-indigo-600 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {{ submitting() ? 'Submitting…' : 'Submit request' }}
      </button>
    </form>
  `,
})
export class RequestForm {
  private readonly leave = inject(LeaveService);

  readonly created = output();

  protected readonly types = LEAVE_TYPES;
  protected readonly field = 'mt-1 w-full rounded border border-slate-300 px-3 py-2 capitalize';
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = inject(NonNullableFormBuilder).group({
    type: ['annual' as LeaveType],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    reason: [''],
  });

  protected submit() {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.error.set(null);

    const { reason, ...rest } = this.form.getRawValue();
    this.leave.create({ ...rest, reason: reason || undefined }).subscribe({
      next: () => {
        this.form.reset();
        this.submitting.set(false);
        this.created.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(errorMessage(err));
        this.submitting.set(false);
      },
    });
  }
}