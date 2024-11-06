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
        const response = await fetch(request.url);
        const data = await response.json();
        request.resolve(data);
      } catch (error) {
        request.reject(error);
      }
    }

    this.processing = false;
  }
}

export const apiQueue = new ApiQueue(); 