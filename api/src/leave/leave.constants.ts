import { LeaveType } from './leave-request.entity';

export const ANNUAL_ALLOWANCE: Record<LeaveType, number | null> = {
  [LeaveType.Annual]: 21,
  [LeaveType.Sick]: 14,
  [LeaveType.Unpaid]: null, // unlimited
};
