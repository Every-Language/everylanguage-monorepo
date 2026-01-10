import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SEARCH_HISTORY_KEY = 'search_history';
const MAX_HISTORY_ITEMS = 10;

interface SearchHistoryItem {
  query: string;
  timestamp: number;
  resultCount: number;
}

export const useSearchHistory = () => {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  const loadSearchHistory = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (stored) {
        const parsedHistory: SearchHistoryItem[] = JSON.parse(stored);
        setHistory(parsedHistory);
        setRecentSearches(parsedHistory.map(item => item.query));
      }
    } catch {
      // console.error('Failed to load search history:', error);
    }
  }, []);

  // Load search history from storage
  useEffect(() => {
    loadSearchHistory();
  }, [loadSearchHistory]);

  const saveSearchHistory = useCallback(
    async (newHistory: SearchHistoryItem[]) => {
      try {
        await AsyncStorage.setItem(
          SEARCH_HISTORY_KEY,
          JSON.stringify(newHistory)
        );
      } catch {
        // console.error('Failed to save search history:', error);
      }
    },
    []
  );

  const addSearch = useCallback(
    (query: string, resultCount: number = 0) => {
      if (!query.trim()) return;

      const newItem: SearchHistoryItem = {
        query: query.trim(),
        timestamp: Date.now(),
        resultCount,
      };

      setHistory(prevHistory => {
        // Remove existing entry if it exists
        const filteredHistory = prevHistory.filter(
          item => item.query !== newItem.query
        );

        // Add new item at the beginning
        const updatedHistory = [newItem, ...filteredHistory].slice(
          0,
          MAX_HISTORY_ITEMS
        );

        // Update recent searches
        setRecentSearches(updatedHistory.map(item => item.query));

        // Save to storage
        saveSearchHistory(updatedHistory);

        return updatedHistory;
      });
    },
    [saveSearchHistory]
  );

  const removeSearch = useCallback(
    (query: string) => {
      setHistory(prevHistory => {
        const updatedHistory = prevHistory.filter(item => item.query !== query);
        setRecentSearches(updatedHistory.map(item => item.query));
        saveSearchHistory(updatedHistory);
        return updatedHistory;
      });
    },
    [saveSearchHistory]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    setRecentSearches([]);
    saveSearchHistory([]);
  }, [saveSearchHistory]);

  const getSearchStats = useCallback(() => {
    const totalSearches = history.length;
    const uniqueQueries = new Set(history.map(item => item.query)).size;
    const avgResults =
      history.length > 0
        ? history.reduce((sum, item) => sum + item.resultCount, 0) /
          history.length
        : 0;

    return {
      totalSearches,
      uniqueQueries,
      avgResults: Math.round(avgResults),
    };
  }, [history]);

  return {
    recentSearches,
    history,
    addSearch,
    removeSearch,
    clearHistory,
    getSearchStats,
  };
};
