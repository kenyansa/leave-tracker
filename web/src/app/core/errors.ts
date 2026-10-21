import { HttpErrorResponse } from '@angular/common/http';

export function errorMessage(err: HttpErrorResponse): string {
  const message = (err.error as { message?: string | string[] } | null)?.message;
  return (Array.isArray(message) ? message.join(', ') : message) ?? 'Something went wrong, try again';
}