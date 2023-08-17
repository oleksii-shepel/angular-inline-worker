/* global InlineWorker */

import { InlineWorker, WorkerArgs } from '../lib/inlineWorker';

function cube(n: any) {
  return n * n;
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

  it('basic inline worker', async (done) => {
    //var worker = new InlineWorker(({data}) => cube);
    // worker
    //   .inject(cube)
    //   .run(5)
    //   .then((val) => {
    //     expect(val).toEqual(25);
    //     done();
    //   });
  });

  it('simple inline worker with long calculation', async (done) => {
    // function isPrime(num: number) {
    //   for (var i = 2, len = num / 2 + 1; i < len; i++) {
    //     if (num % i === 0) {
    //       return false;
    //     }
    //   }
    //   return true;
    // }

    // var worker = new InlineWorker(({data}) => isPrime);
    // worker
    //   .inject(isPrime)
    //   .run(479001599)
    //   .then(function (result) {
    //     expect(result).toBeTruthy();
    //     done();
    //   });
  });

  it('worker with injected functions', async (done) => {
  //   function sqrt(num: number) {
  //     return Math.sqrt(num);
  //   }

  //   function exec({ data }: WorkerArgs) {
  //     return sqrt(cube(data));
  //   }

  //   new InlineWorker(({data}) => exec)
  //     .inject(cube, sqrt, exec)
  //     .run(5)
  //     .then(function (val) {
  //       expect(val).toEqual(5);
  //       done();
  //     });
   });
});
