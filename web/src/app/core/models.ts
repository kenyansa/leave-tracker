export type Role = 'employee' | 'manager';

export interface JwtPayload {
  sub: string;
  role: Role;
  exp: number;
}