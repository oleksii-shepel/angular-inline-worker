


export function cancellable(func: Function) {
  const buffer = (self as any).cancellationBuffer ?? new ArrayBuffer(4);

  function cancelled() {
    let item = new Int32Array(buffer)[0];
    if(item === 1) {
      self.postMessage({type: 'cancelled', value: 'Worker was cancelled from main thread.'});
    }
    return item === 1;
  }

  return (args: any) => func({...args, cancelled});
}



export function observable(func: Function) {
  function progress(value: number) {
    self.postMessage({type: 'progress', value});
  }

  return (args: any) => func({...args, progress});
}
