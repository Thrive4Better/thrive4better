import { useState, useEffect, useRef } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──

export interface FilterOption {
  label: string;
  value: string;
  options: { label: string; value: string }[];
}

export interface TableFilterProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filterOptions?: FilterOption[];
  activeFilters?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  onClearFilters?: () => void;
  resultCount?: number;
  totalCount?: number;
}

// ── Debounce hook ──

function useDebouncedValue(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ── Component ──

export default function TableFilter({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filterOptions = [],
  activeFilters = {},
  onFilterChange,
  onClearFilters,
  resultCount,
  totalCount,
}: TableFilterProps) {
  const [localSearch, setLocalSearch] = useState(searchValue);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external changes
  useEffect(() => {
    setLocalSearch(searchValue);
  }, [searchValue]);

  // Debounced search
  const debouncedSearch = useDebouncedValue(localSearch, 250);

  useEffect(() => {
    if (debouncedSearch !== searchValue) {
      onSearchChange(debouncedSearch);
    }
  }, [debouncedSearch]);

  const hasActiveFilters =
    Object.values(activeFilters).some((v) => v !== '') || searchValue !== '';

  const activeFilterCount = Object.values(activeFilters).filter((v) => v !== '').length;

  return (
    <div className="bg-white rounded-xl border border-sage-pale shadow-sm">
      {/* Search Bar */}
      <div className="p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-forest/60"
          />
          <input
            ref={inputRef}
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-sage-pale bg-sage-pale/20 text-charcoal placeholder:text-mid-gray/60 focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest/40 transition-all text-sm min-h-[44px]"
          />
          {localSearch && (
            <button
              onClick={() => {
                setLocalSearch('');
                onSearchChange('');
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-sage-pale text-mid-gray hover:text-charcoal transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter dropdowns inline */}
        {filterOptions.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0 overflow-x-auto">
            <SlidersHorizontal size={15} className="text-mid-gray flex-shrink-0" />
            {filterOptions.map((filter) => (
              <select
                key={filter.value}
                value={activeFilters[filter.value] ?? ''}
                onChange={(e) => onFilterChange?.(filter.value, e.target.value)}
                className={cn(
                  'text-sm rounded-lg border px-2.5 py-2 bg-white transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-forest/30 min-h-[44px]',
                  activeFilters[filter.value]
                    ? 'border-forest/40 text-forest font-medium'
                    : 'border-sage-pale text-mid-gray'
                )}
              >
                <option value="">{filter.label}</option>
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ))}
          </div>
        )}
      </div>

      {/* Result count + Clear filters bar */}
      {(hasActiveFilters || resultCount !== undefined) && (
        <div className="px-3 pb-2.5 flex items-center justify-between">
          <div className="text-xs text-mid-gray">
            {resultCount !== undefined && (
              <span>
                Showing <span className="font-semibold text-charcoal">{resultCount}</span>
                {totalCount !== undefined && totalCount !== resultCount && (
                  <> of {totalCount}</>
                )}{' '}
                result{resultCount !== 1 ? 's' : ''}
              </span>
            )}
            {activeFilterCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-forest/10 text-forest text-[10px] font-semibold">
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
              </span>
            )}
          </div>
          {hasActiveFilters && onClearFilters && (
            <button
              onClick={() => {
                setLocalSearch('');
                onClearFilters();
              }}
              className="text-xs text-burgundy hover:text-burgundy/80 hover:underline transition-colors font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
