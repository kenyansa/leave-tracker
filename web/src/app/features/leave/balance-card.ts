import { Component, input, model } from '@angular/core';
import { Balance } from '../../core/models';

@Component({
  selector: 'app-balance-card',
  template: `
    <section class="rounded-xl bg-white p-4 shadow">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="font-medium">Balance</h2>
        <select
          #picker
          [value]="year()"
          (change)="year.set(+picker.value)"
          class="rounded border border-slate-300 px-2 py-1 text-sm"
        >
          @for (y of years; track y) {
            <option [value]="y">{{ y }}</option>
          }
        </select>
      </div>

      <div class="grid gap-3 sm:grid-cols-3">
        @for (b of balances(); track b.type) {
          <div class="rounded-lg border border-slate-200 p-3">
            <p class="text-sm capitalize text-slate-500">{{ b.type }}</p>
            @if (b.allowance === null) {
              <p class="text-lg font-semibold">Unlimited</p>
              <p class="text-xs text-slate-500">{{ b.used }} days used</p>
            } @else {
              <p class="text-lg font-semibold">
                {{ b.remaining }}
                <span class="text-sm font-normal text-slate-500">of {{ b.allowance }} left</span>
              </p>
              <div class="mt-2 h-1.5 rounded bg-slate-100">
                <div class="h-1.5 rounded bg-indigo-600" [style.width.%]="(b.used / b.allowance) * 100"></div>
              </div>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class BalanceCard {
  readonly balances = input.required<Balance[]>();
  readonly year = model.required<number>();

  protected readonly years = [new Date().getFullYear(), new Date().getFullYear() + 1];
}