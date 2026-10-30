import type { RenderRequest, RenderResponse } from './openscad.worker';

type Job = { source: string; defines: string[]; resolve: (r: RenderResponse | null) => void };

/**
 * One background OpenSCAD worker. Keeps at most one render running and one
 * waiting; a newer request replaces the waiting one, which resolves to null.
 */
export class Renderer {
  private worker: Worker | null = null;
  private nextId = 1;
  private running: { id: number; resolve: Job['resolve'] } | null = null;
  private waiting: Job | null = null;

  render(source: string, defines: string[]): Promise<RenderResponse | null> {
    return new Promise((resolve) => {
      this.waiting?.resolve(null);
      this.waiting = { source, defines, resolve };
      this.pump();
    });
  }

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('./openscad.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent<RenderResponse>) => {
        const job = this.running;
        this.running = null;
        if (job && job.id === e.data.id) job.resolve(e.data);
        this.pump();
      };
      this.worker.onerror = (e) => {
        const job = this.running;
        this.running = null;
        job?.resolve({ id: job.id, ok: false, stl: null, logs: [`ERROR: worker crashed: ${e.message}`], ms: 0 });
        this.worker?.terminate();
        this.worker = null;
        this.pump();
      };
    }
    return this.worker;
  }

  private pump() {
    if (this.running || !this.waiting) return;
    const job = this.waiting;
    this.waiting = null;
    const id = this.nextId++;
    this.running = { id, resolve: job.resolve };
    const req: RenderRequest = { id, source: job.source, defines: job.defines };
    this.getWorker().postMessage(req);
  }
}
