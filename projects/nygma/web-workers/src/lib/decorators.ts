


export function cancellable(func: Function) {
  const buffer = (self as any).cancellationBuffer ?? new ArrayBuffer(4);

  function cancelled() {
    let item = new Int32Array(buffer)[0];
    if(item === 1) {
      self.postMessage({type: 'cancelled', value: 'Worker was cancelled from main thread.'});
    }
    return item === 1;
  }
  return (data: any, helpers: any) => func(data, {...helpers, cancelled});
}



export function subscribable(func: Function) {
  function next(value: any) {
    self.postMessage({type: 'next', value});
  }
  return (data: any, helpers: any) => func(data, {...helpers, next});
}



export function observable(func: Function) {
  function progress(value: number) {
    self.postMessage({type: 'progress', value});
  }
  return (data: any, helpers: any) => func(data, {...helpers, progress});
}



export function promisify(func: Function) {
  return (data: any, helpers: any) => new Promise((resolve, reject) => {
    throw new Error("asdasdasdasd");
    let resolved = false, rejected = false;
    const done = (args: any) => { resolved = true; resolve(args); };
    const error = (args: any) => { rejected = true; reject(args); };
    const result = func(data, {...helpers, done, error});
    if (result instanceof Promise) {
      return result.then(resolve, reject);
    } else if(!resolved && !rejected && result !== undefined) {
      resolve(result);
      return result;
    }
  });
}
