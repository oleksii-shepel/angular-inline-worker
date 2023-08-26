import { CancellationToken } from "./cancellationToken";
import { WebWorker, isWebpackBundlerPresent, isWorkerSupported } from "./abstractWorker";


export class ModuleWorker extends WebWorker {
  private cancellationToken: CancellationToken | null;
  private workerbody: string | null;
  private onprogress: ((data: number) => void);
  private onnext: ((data: any) => void);
  private injected: string[];
  private chunk: string;
  private funcname: string | undefined;
  private promise: Promise<any> | null;
  private resolve: (args: any) => void;
  private reject: (args: any) => void;
  private static chunksLoaded: Map<string, string> = new Map();
  constructor(chunk: string, funcname?: string) {
    super();

    if (!isWorkerSupported()) {
      throw new Error('Web Worker is not supported');
    }

    if(!isWebpackBundlerPresent()) {
      throw new Error('Module worker supports only webpack bundles');
    }

    this.chunk = chunk; this.funcname = funcname? funcname : "__webpack_undefined__";
    this.cancellationToken = this.promise = null; this.resolve = () => {}; this.reject = () => {};
    this.workerbody = this.worker = null; this.injected  = []; this.onprogress = this.onnext = () => {};
  }

  terminate(): void {
    if(this.running()) {
      this.worker?.terminate();
      this.promise = null;
      this.resolve(undefined);
      this.cancellationToken?.free();
    }
  }

  cancel(): void {
    if(this.running()) {
      this.cancellationToken?.cancel();
    }
  }

  fetch(): Promise<string> {
    if(ModuleWorker.chunksLoaded.has(this.chunk)) {
      return Promise.resolve(ModuleWorker.chunksLoaded.get(this.chunk)!);
    }
    return fetch(this.chunk).then((response) => {
      if(response.ok) { return response.text(); }
      else { return Promise.reject(response.statusText); }
    }).then((content) => {
      ModuleWorker.chunksLoaded.set(this.chunk, content);
      return content;
    });
  }

  run(data?: any, transferList?: Transferable[]): Promise<any> {
    return this.fetch().then((content) => {
      if(!this.promise && content) {
        this.workerbody = `function __worker_cancelled__(){return __worker_tokenIndex__>-1&&1===Atomics.load(__worker_cancellationBuffer__,__worker_tokenIndex__)}function __worker_next__(e){self.postMessage({type:"next",value:e})}function __worker_progress__(e){self.postMessage({type:"progress",value:e})}let __webpack_modules__={},__webpack_load_module__=()=>{};function __webpack_require__(e){let r={exports:{}};return __webpack_modules__[e](r,r.exports,__webpack_require__),e===__webpack_require__.s&&(__webpack_require__.e=r.exports),r.exports}__webpack_require__.r=e=>{e.__esModule=!0},__webpack_require__.o=(e,r)=>Object.prototype.hasOwnProperty.call(e,r),__webpack_require__.d=(e,r)=>{for(var a in r)__webpack_require__.o(r,a)&&!__webpack_require__.o(e,a)&&(e[a]=r[a]())},self.onmessage=function(event){__worker_cancellationBuffer__=new Int32Array(event.data.cancellationBuffer),__worker_tokenIndex__=event.data.tokenIndex;let __worker_promise__=new Promise((__worker_resolve__,__worker_reject__)=>{let __worker_resolved__=!1,__worker_rejected__=!1,__worker_done__=e=>{__worker_resolved__=!0,__worker_resolve__(e)},__worker_error__=e=>{__worker_rejected__=!0,____worker_reject__(e)};__worker_data__=event.data.data,__worker_helpers__={cancelled:__worker_cancelled__,next:__worker_next__,progress:__worker_progress__,done:__worker_done__,error:__worker_error__};${content};__webpack_modules__=self.webpackChunkapp2[0][1],(__webpack_load_module__=self.webpackChunkapp2[0][2])(__webpack_require__);let __webpack_export_functions__=Object.assign({},__webpack_require__.e);delete __webpack_export_functions__.__esModule;let __webpack_function_names__=Object.keys(__webpack_export_functions__),__webpack_function__="${this.funcname}",__worker_result__;if("__webpack_undefined__"!==__webpack_function__?__worker_result__=__webpack_export_functions__[__webpack_function__](__worker_data__,__worker_helpers__):__webpack_function_names__.default?__worker_result__=__webpack_export_functions__[__webpack_function_names__.default](__worker_data__,__worker_helpers__):1===__webpack_function_names__.length&&(__worker_result__=__webpack_export_functions__[__webpack_function_names__[0]](__worker_data__,__worker_helpers__)),__worker_result__ instanceof Promise)return __worker_result__.then(__worker_resolve__,__worker_reject__);if(!__worker_resolved__&&!__worker_rejected__&&void 0!==__worker_result__)return __worker_resolve__(__worker_result__),__worker_result__;if(__worker_cancelled__()){__worker_resolve__(void 0);return}});__worker_promise__.then(e=>{__worker_cancelled__()?self.postMessage({type:"cancelled",value:void 0}):self.postMessage({type:"done",value:e})}).catch(e=>self.postMessage({type:"error",error:e}))};`

        this.cancellationToken = CancellationToken.register();
        let blob = new Blob([this.workerbody].concat(this.injected), { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));
        this.worker.postMessage({ data: data, cancellationBuffer: CancellationToken.buffer, tokenIndex: this.cancellationToken?.index }, transferList as any);
        this.promise = new Promise((resolve, reject) => {
          this.resolve = resolve; this.reject = reject;
          this.worker!.onmessage = (e: MessageEvent) => {
            if (e.data?.type === 'done') { this.promise = null; resolve(e.data.value); this.cancellationToken?.free(); }
            else if (e.data?.type === 'progress') { this.onprogress && this.onprogress(e.data.value); }
            else if (e.data?.type === 'next') { this.onnext && this.onnext(e.data.value); }
            else if (e.data?.type === 'cancelled') { this.promise = null; resolve(undefined); this.cancellationToken?.free(); }
            else if (e.data?.type === 'error') { this.promise = null; reject(e.data.error); this.cancellationToken?.free(); }
          }
        });
      };

      return this.promise;
    });
  }

  running() {
    return !!this.promise;
  }

  progress(fn: (data: any) => void): ModuleWorker {
    this.onprogress = fn;
    return this;
  }

  subscribe(fn: (data: any) => void): ModuleWorker {
    this.onnext = fn;
    return this;
  }

  inject(...args: Function[]): ModuleWorker {
    this.injected = this.injected ?? []
    for (let i = 0; i < args.length; i++) {
      let fn: Function = args[i];
      if (typeof fn === 'function') {
        let funcbody = fn.toString();
        // check if function is anonymous and name it
        funcbody = funcbody.replace(/function[\s]*\(/, `function ${fn.name}(`);

        if(this.injected.indexOf(funcbody) === -1) {
          this.injected.push(funcbody);
        }
      }
    }
    return this;
  }
}
