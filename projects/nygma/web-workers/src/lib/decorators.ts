
export function cancelled() {
  return Atomics.load((self as any).cancellationBuffer as Int32Array, 0) === 1;
}



export function cancellable(func: Function) {
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
    let resolved = false, rejected = false;
    const done = (args: any) => { resolved = true; resolve(args); };
    const error = (args: any) => { rejected = true; reject(args); };
    const result = func(data, {...helpers, done, error});
    if (result instanceof Promise) {
      return result.then(resolve, reject);
    } else if(!resolved && !rejected && result !== undefined) {
      resolve(result); return result;
    } else if(cancelled()) {
      resolve(undefined); return;
    }
  });
}
