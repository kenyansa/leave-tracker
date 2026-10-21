export type Role = 'employee' | 'manager';
export type LeaveType = 'annual' | 'sick' | 'unpaid';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export const LEAVE_TYPES: LeaveType[] = ['annual', 'sick', 'unpaid'];
export const LEAVE_STATUSES: LeaveStatus[] = ['pending', 'approved', 'rejected', 'cancelled'];

export interface JwtPayload {
  sub: string;
  role: Role;
  exp: number;
}
export interface LeaveRequest {
  id: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  reason: string | null;
}

export interface Balance {
  type: LeaveType;
  allowance: number | null;
  used: number;
  remaining: number | null;
}

export interface CreateLeave {
  type: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
}