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
    }).catch(() => { throw new Error("Module loading failed"); });
  }

  run(data?: any, transferList?: Transferable[]): Promise<any> {
    return this.fetch().then((content) => {
      if(!this.promise && content) {
        this.workerbody = `
          function __worker_cancelled__() {
            return __worker_tokenIndex__ > -1 && Atomics.load(__worker_cancellationBuffer__, __worker_tokenIndex__) === 1;
          }

          function __worker_next__(value) {
            self.postMessage({type: 'next', value});
          }

          function __worker_progress__(value) {
            self.postMessage({type: 'progress', value});
          }

          let __webpack_modules__ = {};
          let __webpack_load_module__ = () => {};

          function __webpack_require__(moduleId) {
            let module = { exports: {}};
            __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
            if(moduleId === __webpack_require__.s) {
              __webpack_require__.e = module.exports;
            }
            return module.exports;
          };

          __webpack_require__.r = (__webpack_exports__) => {__webpack_exports__.__esModule = true;}
          __webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
          __webpack_require__.d = (exports, definition) => {
            for(var key in definition) {
              if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
                exports[key] = definition[key]();
              }
            }
          };

          self.onmessage = function (event) {
            __worker_cancellationBuffer__ = new Int32Array(event.data.cancellationBuffer);
            __worker_tokenIndex__ = event.data.tokenIndex;
            const __worker_promise__ = new Promise((__worker_resolve__, __worker_reject__) => {
              let __worker_resolved__ = false, __worker_rejected__ = false;
              const __worker_done__ = (args) => { __worker_resolved__ = true; __worker_resolve__(args); };
              const __worker_error__ = (args) => { __worker_rejected__ = true; ____worker_reject__(args); };
              __worker_data__ = event.data.data; __worker_helpers__ = {cancelled: __worker_cancelled__, next: __worker_next__, progress: __worker_progress__, done: __worker_done__, error: __worker_error__};

              ${content}

              __webpack_modules__ = self["webpackChunkapp2"][0][1];
              __webpack_load_module__ = self["webpackChunkapp2"][0][2];
              __webpack_load_module__(__webpack_require__);
              let __webpack_export_functions__ = Object.assign({}, __webpack_require__.e);
              delete __webpack_export_functions__.__esModule;
              let __webpack_function_names__ = Object.keys(__webpack_export_functions__);
              let __webpack_function__ = '${this.funcname}';
              let __worker_result__ = undefined;
              if(__webpack_function__ !== '__webpack_undefined__') {
                __worker_result__= __webpack_export_functions__[__webpack_function__](__worker_data__, __worker_helpers__);
              } else if (__webpack_function_names__['default']) {
                __worker_result__ = __webpack_export_functions__[__webpack_function_names__['default']](__worker_data__, __worker_helpers__);
              } else if (__webpack_function_names__.length === 1) {
                __worker_result__ = __webpack_export_functions__[__webpack_function_names__[0]](__worker_data__, __worker_helpers__);
              }

              if (__worker_result__ instanceof Promise) {
                return __worker_result__.then(__worker_resolve__, __worker_reject__);
              } else if(!__worker_resolved__ && !__worker_rejected__ && __worker_result__ !== undefined) {
                __worker_resolve__(__worker_result__); return __worker_result__;
              } else if(__worker_cancelled__()) {
                __worker_resolve__(undefined); return;
              }
            });

            __worker_promise__.then(value => { if(!__worker_cancelled__()) { self.postMessage({type: "done", value: value}); }
                                else { self.postMessage({type: "cancelled", value: undefined}); }})
              .catch(error => self.postMessage({type: "error", error: error}));
          };`

        this.cancellationToken = CancellationToken.register();
        let blob = new Blob([this.workerbody].concat(this.injected), { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));
        this.worker.postMessage({ data: data, cancellationBuffer: CancellationToken.buffer, tokenIndex: this.cancellationToken?.index}, transferList as any);
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
