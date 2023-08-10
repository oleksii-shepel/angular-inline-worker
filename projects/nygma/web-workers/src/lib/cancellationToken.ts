


export class CancellationToken {
    private shared: SharedArrayBuffer;
    private array: Int32Array;

    constructor() {
      if(!crossOriginIsolated) {
        throw new Error("CancellationToken is not supported in this environment. Please add following two headers to the top level document: 'Cross-Origin-Embedder-Policy': 'require-corp'; 'Cross-Origin-Opener-Policy': 'same-origin';");
      }
      else {
        this.shared = new SharedArrayBuffer(4);
        this.array = new Int32Array(this.shared);
      }
    }

    public cancel(): void {
      if (this.array) {
        Atomics.store(this.array, 0, 1);
      }
    }

    public get cancelled(): boolean {
      return !!this.array && this.array[0] === 1;
    }

    public get buffer(): SharedArrayBuffer {
      return this.shared;
    }

}
