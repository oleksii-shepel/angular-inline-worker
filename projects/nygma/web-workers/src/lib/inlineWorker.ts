import { CancellationToken } from "./cancellationToken";
import { cancellable, observable } from "./decorators";



export interface WorkerArgs {
  data: any;
  done: Function;
  cancelled?: Function;
  progress?: Function;
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
  private injected!: string[];

  constructor(expr: (x: { [prop in keyof object]: object[prop] }) => any) {
    if (!isWorkerSupported()) {
      throw new Error('Web Worker is not supported');
    }

    this.cancellationToken = crossOriginIsolated? new CancellationToken(): null;
    this.fnBody = 'self.onmessage = function (event) { self.cancellationBuffer = event.data.cancellationBuffer ?? null; self.postMessage((' + expr.toString() + ')()(event.data)) };';
    this.worker = this.onprogress = null;
    this.inject((window as any)[this.funcName(expr.toString())]);
    this.inject(cancellable, observable, result);
  }

  public funcName(expr: string): string {
    let funcName = 'undefined';
    let split = expr.split('=>');
    if(split.length > 1) {
      let funcExpr = split[1].trim();
      let start = -1, end = -1, i = 0;
      do {
        start = -1, end = -1, i = 0;
        while(i < funcExpr.length && funcExpr.charAt(i) !== '(') { i++; }
        if(i !== funcExpr.length) {start = i;}

        i = funcExpr.length - 1;
        while(i > start && funcExpr.charAt(i) !== ')') { i--; }
        if(i !== start) {end = i;}
        if(start !== -1 && end !== -1) {funcExpr = funcExpr.substring(start + 1, end);}
      } while(start !== -1 && end !== -1);
      funcName = funcExpr;

    } else {
      throw new Error('Error by parsing expression');
    }
    return funcName;
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
        else if (e.data?.type === 'cancelled') { resolve({status: 'cancelled', value: e.data.value}); }
      }
      this.worker!.onerror = (e: ErrorEvent) => reject(e.error);
    });
  }

  progress(fn: (data: any) => void): InlineWorker {
    this.onprogress = fn;
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



export function result(value: any) {
  self.postMessage({type: 'done', value});
}



export function isWorkerSupported(): boolean {
  return !!Worker;
}
