import { CancellationToken } from "./cancellationToken";
import { cancellable, observable, subscribable, promisify, cancelled } from "./decorators";



export interface WorkerHelpers {
  cancelled: Function;
  next: Function;
  progress: Function;
  done: Function;
  error: Function;
}



export type WorkerResult = any;



export type WorkerTask = (data: any, helpers: WorkerHelpers | any) => WorkerResult | Promise<WorkerResult>;



export class InlineWorker {
  private cancellationToken: CancellationToken | null;
  private fnBody: string;
  private worker: Worker | null;
  private onprogress: ((data: number) => void);
  private onnext: ((data: any) => void);
  private injected: string[];
  private promise: Promise<any> | null;
  constructor(task: WorkerTask) {

    if (!isWorkerSupported()) {
      throw new Error('Web Worker is not supported');
    }
    this.cancellationToken = crossOriginIsolated? new CancellationToken(): null;

    // function body cleaned from WEBPACK_IMPORTS
    let taskBody = task.toString().replace(/(\(\d+\s*,\s*[^.]+\.)(\w+)(\)\()(.*)(\))/g, "$2($4)");

    this.fnBody = `

      self.onmessage = function (event) {
        self.cancellationBuffer = event.data.cancellationBuffer ?? new ArrayBuffer(4);
        const func = (${cancellable.name}(${observable.name}(${subscribable.name}(${taskBody}))));
        const promise = ${promisify.name}(func);
        promise(event.data.data, {})
          .then(value => { if(!${cancelled.name}()) { self.postMessage({type: "done", value: value}); }})
          .catch(error => self.postMessage({type: "error", error: error}));
      };`;

    this.worker = this.promise = null;
    this.injected  = []; this.onprogress = this.onnext = () => {};
    this.inject(cancelled);
    this.inject(cancelled, cancellable, observable, subscribable, promisify);
  }

  public static terminate(workers: InlineWorker[]): void {
    workers.forEach(worker => worker.worker?.terminate());
  }

  public cancel(): void {
    if(this.worker) {
      this.cancellationToken?.cancel();
    }
  }

  public terminate(): void {
    if(this.worker) {
      this.worker.terminate();
    }
  }

  public run(data?: any, transferList?: Transferable[]): Promise<any> {
    if(!this.promise) {
      let blob = new Blob([this.fnBody].concat(this.injected), { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
      this.worker.postMessage({ data: data, cancellationBuffer: this.cancellationToken?.buffer}, transferList as any);
      this.promise = new Promise((resolve, reject) => {
        this.worker!.onmessage = (e: MessageEvent) => {
          if (e.data?.type === 'done') { this.cancellationToken?.reset(); this.promise = null; resolve(e.data.value); }
          else if (e.data?.type === 'progress') { this.onprogress && this.onprogress(e.data.value); }
          else if (e.data?.type === 'next') { this.onnext && this.onnext(e.data.value); }
          else if (e.data?.type === 'cancelled') { this.cancellationToken?.reset(); this.promise = null; resolve(undefined); }
          else if (e.data?.type === 'error') { this.cancellationToken?.reset(); this.promise = null; reject(e.data.error); }
        }
      });
    }

    return this.promise;
  }

  running() {
    return !!this.promise;
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
