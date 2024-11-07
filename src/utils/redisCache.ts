export const redisCacheUtils = {
  set: async <T>(key: string, data: T, expiresIn: number = 3600000): Promise<void> => {
    try {
      await fetch('http://localhost:3001/cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key, data, expiresIn })
      });
    } catch (error) {
      console.error('Error setting Redis cache:', error);
      // Fallback to localStorage
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now(),
        expiresIn
      }));
    }
  },

  get: async <T>(key: string): Promise<T | null> => {
    try {
      const response = await fetch(`http://localhost:3001/cache/${encodeURIComponent(key)}`);
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error getting Redis cache:', error);
      // Fallback to localStorage
      const localItem = localStorage.getItem(key);
      if (localItem) {
        const parsed = JSON.parse(localItem);
        return parsed.data as T;
      }
      return null;
    }
  },

  clear: async (key: string): Promise<void> => {
    try {
      await fetch(`http://localhost:3001/cache/${encodeURIComponent(key)}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error clearing Redis cache:', error);
      localStorage.removeItem(key);
    }
  }
}; 