// ─────────────────────────────────────────────────────────────────────────────
// Generic pagination / state helpers used across admin services
// ─────────────────────────────────────────────────────────────────────────────

export interface PagedResult<T> {
  items: T[];
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
}

export interface LoadState {
  isLoading: boolean;
  error: string | null;
}
