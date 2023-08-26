
export class CancellationToken {
  static MAX_NUMBER_OF_WORKERS = 128;

  private static booked: boolean[] = new Array<boolean>(this.MAX_NUMBER_OF_WORKERS);
  private static shared: ArrayBuffer = crossOriginIsolated? new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * this.MAX_NUMBER_OF_WORKERS): new ArrayBuffer(0);
  private static array: Int32Array = new Int32Array(this.shared);
  private static allocatedTokens = 0;

  private tokenIndex: number;

  private constructor(offset: number) {
    this.tokenIndex = offset;
  }

  static register(): CancellationToken {
    const index = this.findIndex(this.allocatedTokens, (index: number) => this.booked[index] === false);
    if(index === -1) {
      throw new Error('Number of cancellation tokens exceeded the admissible limit');
    } else if(CancellationToken.withinArray(index)) {
      this.booked[index] = true;
      Atomics.store(CancellationToken.array, index, 0);
      this.allocatedTokens++;
    }
    return new CancellationToken(index);
  }

  free() {
    CancellationToken.booked[this.tokenIndex] = false;
  }

  cancel(): void {
    if (CancellationToken.array && CancellationToken.withinArray(this.tokenIndex)) {
      Atomics.store(CancellationToken.array, this.tokenIndex, 1);
    }
  }

  reset(): void {
    if (CancellationToken.array && CancellationToken.withinArray(this.tokenIndex)) {
      Atomics.store(CancellationToken.array, this.tokenIndex, 0);
    }
  }

  get cancelled(): boolean {
    return CancellationToken.withinArray(this.tokenIndex) && Atomics.load(CancellationToken.array, this.tokenIndex) === 1;
  }

  get index(): number {
    return this.tokenIndex
  }

  static get buffer(): ArrayBuffer {
    return CancellationToken.shared;
  }

  private static withinArray(index: number): boolean {
    return index > -1 && CancellationToken.array.byteLength / Int32Array.BYTES_PER_ELEMENT > index;
  }

  private static findIndex(start: number, predicate: Function): number {
    const arrayLength = CancellationToken.array.byteLength / Int32Array.BYTES_PER_ELEMENT;
    let unchecked = arrayLength;
    while(unchecked !== 0) {
      if(start > arrayLength) { start %= arrayLength; }
      if(predicate(start)) { return start; }
      else { start++; unchecked--; }
    }

    return -1;
  }
}


export function isCancellationSupported(): boolean {
  return crossOriginIsolated;
}


if(!isCancellationSupported()) {
  console.warn("CancellationToken is not supported in this environment. Please add following two headers to the top level document: 'Cross-Origin-Embedder-Policy': 'require-corp'; 'Cross-Origin-Opener-Policy': 'same-origin';");
}

