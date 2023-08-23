export interface WorkerHelpers {
  cancelled: Function;
  next: Function;
  progress: Function;
  done: Function;
  error: Function;
}

export type WorkerResult = any;
export type WorkerTask = (data: any, helpers: WorkerHelpers | any) => WorkerResult | Promise<WorkerResult>;

export abstract class WebWorker {
  protected worker: Worker| null = null;

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
