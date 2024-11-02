interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

export const cacheUtils = {
  set: <T>(key: string, data: T, expiresIn: number = 3600000) => {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expiresIn
    };
    try {
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      localStorage.clear();
      try {
        localStorage.setItem(key, JSON.stringify(item));
      } catch (error) {
        console.error('Error setting cache after clearing:', error);
      }
    }
  },

  get: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      if (!item) {
        return null;
      }

      const parsedItem: CacheItem<T> = JSON.parse(item);
      const now = Date.now();

      if (now - parsedItem.timestamp > parsedItem.expiresIn) {
        localStorage.removeItem(key);
        return null;
      }

      console.log(`Cache hit: ${key}`); // Keeping only cache hit log
      return parsedItem.data;
    } catch (error) {
      console.error('Error getting cache:', error);
      return null;
    }
  },

  clear: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
};