export interface WorkerHelpers {
  cancelled: Function;
  next: Function;
  progress: Function;
  done: Function;
  error: Function;
}

export type WorkerResult = any;
export type WorkerTask = (data: any, helpers: WorkerHelpers | any) => WorkerResult | Promise<WorkerResult>;

export class CancellationToken {
  private shared: ArrayBuffer;
  private array: Int32Array;

  constructor() {
    if(!crossOriginIsolated) {
      console.warn("CancellationToken is not supported in this environment. Please add following two headers to the top level document: 'Cross-Origin-Embedder-Policy': 'require-corp'; 'Cross-Origin-Opener-Policy': 'same-origin';");
    }

    this.shared = crossOriginIsolated? new SharedArrayBuffer(4): new ArrayBuffer(4);
    this.array = new Int32Array(this.shared);
  }

  public cancel(): void {
    if (this.array) {
      Atomics.store(this.array, 0, 1);
    }
  }

  public reset(): void {
    if (this.array) {
      Atomics.store(this.array, 0, 0);
    }
  }

  public get cancelled(): boolean {
    return !!this.array && this.array[0] === 1;
  }

  public get buffer(): ArrayBuffer {
    return this.shared;
  }
}

export abstract class WebWorker {
  protected worker: Worker | null = null;

  static terminate(workers: WebWorker[]): void {
    workers.forEach(worker => worker.worker?.terminate());
  }

  static cancel(workers: WebWorker[]): void {
    workers.forEach(worker => worker.cancel());
  }

  abstract terminate(): void;
  abstract cancel(): void;
  abstract run(data?: any, transferList?: Transferable[]): Promise<any>;
  abstract running(): boolean;
  abstract progress(fn: (data: any) => void): WebWorker;
  abstract subscribe(fn: (data: any) => void): WebWorker;
  abstract inject(...args: Function[]): WebWorker;
}

export function isWorkerSupported(): boolean {
  return !!Worker;
}

export function isWebpackBundlerPresent(): boolean {
  return !!(window as any)["webpackChunkapp2"]
}
