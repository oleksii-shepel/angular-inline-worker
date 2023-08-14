


export class CancellationToken {
  private shared: ArrayBuffer;
  private array: Int32Array;

  constructor() {
    if(!crossOriginIsolated) {
      console.warn("CancellationToken is not supported in this environment. Please add following two headers to the top level document: 'Cross-Origin-Embedder-Policy': 'require-corp'; 'Cross-Origin-Opener-Policy': 'same-origin';");
    }

    this.shared = crossOriginIsolated ? new SharedArrayBuffer(4): new ArrayBuffer(4);
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
