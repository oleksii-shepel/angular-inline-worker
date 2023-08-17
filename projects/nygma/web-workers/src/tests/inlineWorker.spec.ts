/* global InlineWorker */

import { InlineWorker, WorkerArgs } from '../lib/inlineWorker';

function cube(n: any) {
  return n * n * n;
}

describe('Inline Worker', function () {
  var originalTimeout: number;

  beforeEach(function () {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 100000;
  });

  afterEach(function () {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
  });

  it('basic inline worker', (done) => {
    var worker = new InlineWorker(({data}) => cube(data));
    worker
      .inject(cube)
      .run(5)
      .then((value) => {
        expect(value).toEqual(125);
        done();
    });
  });

  it('simple inline worker with long calculation', (done) => {
    function isPrime(num: number) {
      for (var i = 2, len = num / 2 + 1; i < len; i++) {
        if (num % i === 0) {
          return false;
        }
      }
      return true;
    }

    var worker = new InlineWorker(({data}) => isPrime(data));
    worker
      .inject(isPrime)
      .run(479001599)
      .then((value) => {
        expect(value).toBeTruthy();
        done();
      });
  });

  it('worker with injected functions', (done) => {
    function sqrt(num: number) {
      return Math.sqrt(num);
    }

    function exec({ data }: WorkerArgs) {
      return sqrt(cube(data) / data);
    }

    new InlineWorker((data) => exec(data))
      .inject(cube, sqrt, exec)
      .run(5)
      .then((value) => {
        expect(value).toEqual(5);
        done();
      });
  });

  it('executes async function within worker', (done) => {
    async function exec() {
      let response = await fetch('jsonplaceholder.typicode.com/todos/1');
      let result = await response.json();
      return result;
    }

    new InlineWorker(exec)
      .run()
      .then((value) => {
        done();
      });
  });
});

