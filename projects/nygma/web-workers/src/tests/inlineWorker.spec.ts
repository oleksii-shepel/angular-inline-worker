/* global InlineWorker */

import { InlineWorker, WorkerHelpers } from '../lib/inlineWorker';

export function cube(n: any) {
  return n * n * n;
}

export function task(data: number, {progress, cancelled, done}: any) {
  progress(0);
  let value = 0;
  for (var i = 2, len = data / 2 + 1; i < len; i++) {
    if(i / len - value > 0.01) {
      value = i / len;
      progress(value);

      if(cancelled()) {
        return;
      }
    }
    if (data % i === 0) {
      progress(1);
      done(false);
    }
  }
  progress(1);
  done(true);
}

export function timer(data: number, {done, next, cancelled}: WorkerHelpers) {
  next('timer set to ' + data + 'ms');

  let interval = setInterval(() => {
    data -= 1000;
    next(data + 'ms left');

    if(data <= 0) {
      clearInterval(interval);
      next('time is up');
      done();
    }
    if(cancelled()) {
      clearInterval(interval);
      next('timer cancelled');
    }
  }, 1000);
}

describe('Inline Worker', function () {
  var originalTimeout: number;

  beforeEach(function () {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
  });

  afterEach(function () {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
  });

  it('basic inline worker', (done) => {
    var worker = new InlineWorker((data) => cube(data));
    worker
      .inject(cube)
      .run(5)
      .then((value) => {
        expect(value).toEqual(125);
        done();
      }).catch(done.fail);
  });

  it('simple inline worker with long calculation', (done) => {

    var worker = new InlineWorker(task);
    worker
      .run(479001599)
      .then((value) => {
        expect(value).toBeTruthy();
        done();
      }).catch(done.fail);
  });

  it('worker with injected functions', (done) => {
    function sqrt(num: number) {
      return Math.sqrt(num);
    }

    function exec(data: number) {
      return sqrt(cube(data) / data);
    }

    new InlineWorker((data) => exec(data))
      .inject(cube, sqrt, exec)
      .run(5)
      .then((value) => {
        expect(value).toEqual(5);
        done();
      }).catch(done.fail);
  });

  it('async function within worker', (done) => {
    async function exec() {
      let response = await fetch('https://jsonplaceholder.typicode.com/todos/1');
      let result = await response.json();
      return result;
    }

    new InlineWorker(exec)
      .run()
      .then((value) => {
        expect(value).toEqual({
          "userId": 1,
          "id": 1,
          "title": "delectus aut autem",
          "completed": false
        });
        done();
      }).catch(done.fail);
  });

  it('task cancellation', (done) => {

    const worker = new InlineWorker(task);
    worker.progress(value => expect(value).toBeLessThan(1)).run(4790016029);

    const timeout = setTimeout(() => {
      worker.cancel();
      clearTimeout(timeout);
    }, 100);

    const interval = setInterval(() => {
      if(!worker.running()) {
        clearInterval(interval);
        done();
      }
    }, 100);
  });


  it('main thread notification', (done) => {
    const worker = new InlineWorker(timer);
    let count = 0;
    worker.subscribe(value => { if (typeof value === 'string') { count++; }}).run(3000).then((value) => {
      expect(count).toBeGreaterThanOrEqual(3);
      done();
    }).catch(done.fail);
  });
  ;
});

