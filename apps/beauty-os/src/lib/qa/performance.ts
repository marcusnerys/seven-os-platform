import { PerformanceMetrics } from './types';
import { logger } from './logger';

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    renderTime: 0,
    firebaseLatency: 0,
    fps: 60,
  };

  private frameCount = 0;
  private lastTime = performance.now();

  constructor() {
    this.startFPSCounter();
  }

  private startFPSCounter() {
    const loop = () => {
      this.frameCount++;
      const now = performance.now();
      if (now >= this.lastTime + 1000) {
        this.metrics.fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
        this.frameCount = 0;
        this.lastTime = now;
      }
      requestAnimationFrame(loop);
    };
    if (typeof window !== 'undefined') {
      requestAnimationFrame(loop);
    }
  }

  recordFirebaseLatency(duration: number) {
    this.metrics.firebaseLatency = duration;
    if (duration > 1000) {
      logger.warn('Performance', `Latência alta detectada no Firebase: ${duration}ms`);
    }
  }

  recordRenderTime(duration: number) {
    this.metrics.renderTime = duration;
  }

  getMetrics(): PerformanceMetrics {
    return {
      ...this.metrics,
      memoryUsage: (performance as any).memory?.usedJSHeapSize / (1024 * 1024)
    };
  }
}

export const perfMonitor = new PerformanceMonitor();
