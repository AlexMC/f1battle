interface QueuedRequest {
  url: string;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

class ApiQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private requestsThisSecond = 0;
  private lastRequestTime = 0;
  private readonly MAX_REQUESTS_PER_SECOND = 3;
  private readonly DELAY_BETWEEN_REQUESTS = 400;

  private isOpenF1Request(url: string): boolean {
    return url.startsWith('/api/') && !url.includes('/db/') && !url.includes('/redis/');
  }

  async enqueue<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ 
        url, 
        resolve: resolve as (value: any) => void, 
        reject 
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      if (now - this.lastRequestTime < 1000) {
        if (this.requestsThisSecond >= this.MAX_REQUESTS_PER_SECOND) {
          await new Promise(resolve => setTimeout(resolve, 1000 - (now - this.lastRequestTime)));
          this.requestsThisSecond = 0;
          this.lastRequestTime = Date.now();
        }
      } else {
        this.requestsThisSecond = 0;
        this.lastRequestTime = now;
      }

      const request = this.queue.shift()!;
      this.requestsThisSecond++;

      try {
        await new Promise(resolve => setTimeout(resolve, this.DELAY_BETWEEN_REQUESTS));
        let response: Response;
        let data: any;
        
        if (this.isOpenF1Request(request.url)) {
          console.log(`[OpenF1 API Request] ${request.url}`);
          const startTime = Date.now();
          response = await fetch(request.url);
          data = await response.json();
          const duration = Date.now() - startTime;
          console.log(`[OpenF1 API Response] ${request.url} - Status: ${response.status}, Duration: ${duration}ms, Data Length: ${Array.isArray(data) ? data.length : 1}`);
        } else {
          response = await fetch(request.url);
          data = await response.json();
        }
        
        request.resolve(data);
      } catch (error) {
        if (this.isOpenF1Request(request.url)) {
          console.error(`[OpenF1 API Error] ${request.url} -`, error);
        }
        request.reject(error);
      }
    }

    this.processing = false;
  }
}

export const apiQueue = new ApiQueue(); 