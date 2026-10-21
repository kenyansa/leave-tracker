import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_URL } from './config';
import { Balance, CreateLeave, Decision, LeaveRequest, PendingLeave } from './models';

@Injectable({ providedIn: 'root' })
export class LeaveService {
  private readonly http = inject(HttpClient);
  private readonly url = `${API_URL}/leave`;

  mine() {
    return this.http.get<LeaveRequest[]>(`${this.url}/me`);
  }

  balance(year: number) {
    return this.http.get<Balance[]>(`${this.url}/balance`, { params: { year } });
  }

  create(dto: CreateLeave) {
    return this.http.post<LeaveRequest>(this.url, dto);
  }

  cancel(id: string) {
    return this.http.patch<LeaveRequest>(`${this.url}/${id}/cancel`, {});
  }

  pending() {
    return this.http.get<PendingLeave[]>(`${this.url}/pending`);
  }

  decide(id: string, decision: Decision) {
    return this.http.patch<LeaveRequest>(`${this.url}/${id}/${decision}`, {});
  }
}