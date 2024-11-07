import express, { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import Redis from 'ioredis';
import compression from 'compression';

const app = express();
const port = 3001;

app.use(express.json({ limit: '50mb' }));
app.use(compression());
app.use(cors());

const redis = new Redis({
  host: 'localhost',
  port: 6379
});

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresIn: number;
}

interface CacheRequest {
  key: string;
  data: unknown;
  expiresIn?: number;
}

interface CacheParams {
  key: string;
}

const setCacheHandler: RequestHandler<{}, any, CacheRequest> = async (req, res): Promise<void> => {
  const { key, data, expiresIn = 3600000 } = req.body;
  try {
    const item: CacheItem<unknown> = {
      data,
      timestamp: Date.now(),
      expiresIn
    };
    await redis.set(key, JSON.stringify(item), 'PX', expiresIn);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to set cache' });
  }
};

const getCacheHandler: RequestHandler<CacheParams> = async (req, res): Promise<void> => {
  try {
    const item = await redis.get(req.params.key);
    if (!item) {
      res.json({ data: null });
      return;
    }
    const parsedItem = JSON.parse(item) as CacheItem<unknown>;
    res.json({ data: parsedItem.data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get cache' });
  }
};

const clearCacheHandler: RequestHandler<CacheParams> = async (req, res): Promise<void> => {
  try {
    await redis.del(req.params.key);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear cache' });
  }
};

app.post('/cache', setCacheHandler);
app.get('/cache/:key', getCacheHandler);
app.delete('/cache/:key', clearCacheHandler);

app.listen(port, () => {
  console.log(`Cache server running on port ${port}`);
}); 