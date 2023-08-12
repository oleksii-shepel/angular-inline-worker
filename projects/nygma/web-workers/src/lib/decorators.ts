


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



export function subscribable(func: Function) {
  function next(value: any) {
    self.postMessage({type: 'next', value});
  }

  return (args: any) => func({...args, next});
}



export function observable(func: Function) {
  function progress(value: number) {
    self.postMessage({type: 'progress', value});
  }

  return (args: any) => func({...args, progress});
}



export function promisify(func: Function, args: object) {
  const promise = new Promise((resolve, reject) => {
    const result = func({...args, done: resolve, error: reject});
    if (result && result.then) {
      result.then(resolve, reject);
    }
  });

  return promise;
}
