import { CancellationToken } from "./cancellationToken";
import { cancellable, observable, subscribable, promisify } from "./decorators";



export interface WorkerArgs {
  data: any;
  cancelled: Function;
  next: Function;
  progress: Function;
  done: Function;
  error: Function;
}



export interface WorkerResult {
  status: 'success' | 'cancelled' | 'error';
  value?: any;
  error?: any;
}



export class InlineWorker {
  private cancellationToken: CancellationToken | null;
  private fnBody!: string;
  private worker!: Worker | null;
  private onprogress!: ((data: number) => void) | null;
  private onnext!: ((data: any) => void) | null;
  private injected!: string[];

  constructor(task: Function) {

    if (!isWorkerSupported()) {
      throw new Error('Web Worker is not supported');
    }

    this.cancellationToken = crossOriginIsolated? new CancellationToken(): null;
    this.fnBody = `
      const func = (${cancellable.name}(${observable.name}(${subscribable.name}(${task.toString()}))));
      self.onmessage = function (event) {
        const promise = ${promisify.name}(func, event.data);
        self.cancellationBuffer = event.data.cancellationBuffer ?? null;
        promise.then(value => self.postMessage({type: "done", value: value}));
      };`;
    this.worker = this.onprogress = this.onnext = null;
    this.inject(cancellable, observable, subscribable, promisify);
  }

  public static terminate(workers: InlineWorker[]): void {
    workers.forEach(worker => worker.worker?.terminate());
  }

  public cancel(): void {
    this.cancellationToken?.cancel();
  }

  public terminate(): void {
    if(this.worker) {
      this.worker.terminate();
    }
  }

  public run(message: any, transferList?: Transferable[]): Promise<any> {

    let blob = new Blob([this.fnBody].concat(this.injected), { type: 'application/javascript' });
    this.worker = new Worker(URL.createObjectURL(blob));

    this.worker.postMessage(this.fnBody.includes('cancellable')? {...message, cancellationBuffer: this.cancellationToken?.buffer} : message, transferList as any);
    return new Promise((resolve, reject) => {
      this.worker!.onmessage = (e: MessageEvent) => {
        if(e.data?.type === 'done') { resolve({status: 'success', value: e.data.value}); }
        else if (e.data?.type === 'progress') { this.onprogress && this.onprogress(e.data.value); }
        else if (e.data?.type === 'next') { this.onnext && this.onnext(e.data.value); }
        else if (e.data?.type === 'cancelled') { resolve({status: 'cancelled'}); }
      }
      this.worker!.onerror = (e: ErrorEvent) => reject({status: 'error', error: e.error});
    });
  }

  progress(fn: (data: any) => void): InlineWorker {
    this.onprogress = fn;
    return this;
  }

  subscribe(fn: (data: any) => void): InlineWorker {
    this.onnext = fn;
    return this;
  }

  public inject(...args: Function[]): InlineWorker {
    this.injected = this.injected ?? []
    for (let i = 0; i < args.length; i++) {
      let fn: Function = args[i];
      if (typeof fn === 'function') {
        let fnBody = fn.toString();
        //check if function is anonymous and name it
        fnBody = fnBody.replace(/function[\s]*\(/, `\n\nfunction ${fn.name}(`);

        if(this.injected.indexOf(fnBody) === -1) {
          this.injected.push(fnBody);
        }
      }
    }
    return this;
  }
}



export function isWorkerSupported(): boolean {
  return !!Worker;
}
