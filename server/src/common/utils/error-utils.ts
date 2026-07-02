export function hasErrorCode(error: unknown, code: string): boolean {
  if (!error || typeof error !== 'object') return false;
  return 'code' in error && (error as { code?: unknown }).code === code;
}

export function getErrorMessage(error: unknown, fallback = 'Erreur inconnue'): string {
  return error instanceof Error ? error.message : fallback;
}
