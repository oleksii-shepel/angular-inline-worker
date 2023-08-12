


export function cancellable(func: Function) {
  const buffer = (self as any).cancellationBuffer ?? new ArrayBuffer(4);

  return (args: any) => func({...args, get cancelled() : boolean {
    let item = new Int32Array(buffer)[0];
    if(item === 1) {
      self.postMessage({type: 'cancelled', value: 'Worker was cancelled from main thread.'});
    }
    return item === 1;
  }});
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



export function result(func: Function) {
  function done(value: any) {
    self.postMessage({type: 'done', value});
  }

  return (args: any) => func({...args, done});
}
