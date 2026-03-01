export interface InvoiceFilterState {
  searchTerm:         string;
  dateFrom:           string | null;
  dateTo:             string | null;
  selectedCategories: string[];
  selectedStatuses:   string[];
}

export const DEFAULT_FILTER: InvoiceFilterState = {
  searchTerm:         '',
  dateFrom:           null,
  dateTo:             null,
  selectedCategories: [],
  selectedStatuses:   [],
};
