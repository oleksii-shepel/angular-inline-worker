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
      this.cancellationToken?.release();
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
    }).catch(() => { throw new Error("Module loading failed"); });
  }

  run(data?: any, transferList?: Transferable[]): Promise<any> {
    return this.fetch().then((content) => {
      if(!this.promise && content) {
        this.workerbody = `let __wm__={},__wlm__=()=>{};function __webpack_require__(e){let r={exports:{}};return __wm__[e](r,r.exports,__webpack_require__),e===__webpack_require__.s&&(__webpack_require__.e=r.exports),r.exports}__webpack_require__.r=e=>{e.__esModule=!0},__webpack_require__.o=(e,r)=>Object.prototype.hasOwnProperty.call(e,r),__webpack_require__.d=(e,r)=>{for(var a in r)__webpack_require__.o(r,a)&&!__webpack_require__.o(e,a)&&(e[a]=r[a]())},self.onmessage=function(event){let __wcb__=new Int32Array(event.data.cancellationBuffer),__wti__=event.data.tokenIndex,__wp__=new Promise((__wr__,__wrj__)=>{let __wrd__=!1,__wrjd__=!1,__wd__=event.data.data,__whs__={cancelled:()=>__wti__>-1&&1===Atomics.load(__wcb__,__wti__),next(e){self.postMessage({type:"next",value:e})},progress(e){self.postMessage({type:"progress",value:e})},done(e){__wrd__=!0,__wr__(e)},error(e){__wrjd__=!0,____wrj__(e)}};${content};__wm__=self.webpackChunkapp2[0][1],(__wlm__=self.webpackChunkapp2[0][2])(__webpack_require__);let __wef__=Object.assign({},__webpack_require__.e);delete __wef__.__esModule;let __wfn__=Object.keys(__wef__),__wf__="${this.funcname}",__wrst__;if("__webpack_undefined__"!==__wf__?__wrst__=__wef__[__wf__](__wd__,__whs__):__wfn__.default?__wrst__=__wef__[__wfn__.default](__wd__,__whs__):1===__wfn__.length&&(__wrst__=__wef__[__wfn__[0]](__wd__,__whs__)),__wrst__ instanceof Promise)return __wrst__.then(__wr__,__wrj__);if(!__wrd__&&!__wrjd__&&void 0!==__wrst__)return __wr__(__wrst__),__wrst__;if(__wc__()){__wr__(void 0);return}});__wp__.then(e=>{__wc__()?self.postMessage({type:"cancelled",value:void 0}):self.postMessage({type:"done",value:e})}).catch(e=>self.postMessage({type:"error",error:e}))};`

        this.cancellationToken = CancellationToken.register();
        let blob = new Blob([this.workerbody].concat(this.injected), { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));
        this.worker.postMessage({ data: data, cancellationBuffer: CancellationToken.buffer, tokenIndex: this.cancellationToken?.index }, transferList as any);
        this.promise = new Promise((resolve, reject) => {
          this.resolve = resolve; this.reject = reject;
          this.worker!.onmessage = (e: MessageEvent) => {
            if (e.data?.type === 'done') { this.promise = null; resolve(e.data.value); this.cancellationToken?.release(); }
            else if (e.data?.type === 'progress') { this.onprogress && this.onprogress(e.data.value); }
            else if (e.data?.type === 'next') { this.onnext && this.onnext(e.data.value); }
            else if (e.data?.type === 'cancelled') { this.promise = null; resolve(undefined); this.cancellationToken?.release(); }
            else if (e.data?.type === 'error') { this.promise = null; reject(e.data.error); this.cancellationToken?.release(); }
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
