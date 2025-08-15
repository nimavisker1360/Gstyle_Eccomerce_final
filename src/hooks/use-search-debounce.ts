import { useState, useEffect, useCallback } from "react";

interface UseSearchDebounceOptions {
  delay?: number; // تأخیر به میلی‌ثانیه
  minLength?: number; // حداقل طول برای شروع جستجو
}

export function useSearchDebounce<T>(
  searchFunction: (query: string) => Promise<T>,
  options: UseSearchDebounceOptions = {}
) {
  const {
    delay = 1000, // پیش‌فرض: ۱ ثانیه
    minLength = 2, // پیش‌فرض: حداقل ۲ کاراکتر
  } = options;

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= minLength) {
        setDebouncedQuery(query);
      } else {
        setDebouncedQuery("");
        setResults(null);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [query, delay, minLength]);

  // Search effect
  useEffect(() => {
    if (!debouncedQuery) {
      setResults(null);
      setLoading(false);
      return;
    }

    const performSearch = async () => {
      try {
        setLoading(true);
        setError(null);

        const searchResults = await searchFunction(debouncedQuery);
        setResults(searchResults);
      } catch (err) {
        setError(err instanceof Error ? err.message : "خطا در جستجو");
        setResults(null);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery, searchFunction]);

  // تابع برای تغییر query
  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  // تابع برای پاک کردن query
  const clearQuery = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    setResults(null);
    setLoading(false);
    setError(null);
  }, []);

  // تابع برای جستجوی دستی (بدون debounce)
  const searchImmediately = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.length < minLength) {
        setError(`حداقل ${minLength} کاراکتر برای جستجو نیاز است`);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const searchResults = await searchFunction(searchQuery);
        setResults(searchResults);
        setQuery(searchQuery);
        setDebouncedQuery(searchQuery);
      } catch (err) {
        setError(err instanceof Error ? err.message : "خطا در جستجو");
        setResults(null);
      } finally {
        setLoading(false);
      }
    },
    [searchFunction, minLength]
  );

  return {
    // State
    query,
    debouncedQuery,
    results,
    loading,
    error,

    // Actions
    updateQuery,
    clearQuery,
    searchImmediately,

    // Computed
    hasQuery: query.length > 0,
    isValidQuery: query.length >= minLength,
    isSearching: loading && debouncedQuery.length > 0,
  };
}
