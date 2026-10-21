import { Routes } from '@angular/router';
import { authGuard, managerGuard } from './core/guards';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login').then((m) => m.Login) },
  { path: '', canActivate: [authGuard], loadComponent: () => import('./features/leave/leave-page').then((m) => m.LeavePage) },
  {
    path: 'approvals',
    canActivate: [authGuard, managerGuard],
    loadComponent: () => import('./features/approvals/approvals-page').then((m) => m.ApprovalsPage),
  },
  { path: '**', redirectTo: '' },
];