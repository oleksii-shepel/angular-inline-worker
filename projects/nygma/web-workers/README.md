# nygma-web-workers

<p align="center">
  <img src="https://raw.githubusercontent.com/oleksii-shepel/angular-inline-worker/master/projects/nygma/web-workers/emblem.png" alt="nygma" width="600"/>
</p>
  
  ![npm version](https://badge.fury.io/js/nygma-web-workers.svg)
  ![npm](https://img.shields.io/npm/dt/nygma-web-workers.svg)
  ![npm](https://img.shields.io/npm/l/nygma-web-workers.svg)

<p align="justify">
A web worker is a JavaScript process that runs in the background of a webpage, without affecting the performance of the page. You can use most standard JavaScript features inside a web worker, but you can’t directly affect the parent page.
</p>

<p align="justify">
Inline web workers are web workers that are created in the same web page context or on the fly, without requiring a separate JavaScript file. Blobs and object URLs are used under the hood to create inline web workers from functions or strings. Web workers allow you to perform true multi-threading and concurrency in your web applications.
</p>

<p align="justify">
<b>nygma-web-workers</b> is a lightweight Javascript library that simplifies your interaction with web workers. The way you work with web workers is reminiscent of the use of thread objects in modern OOP languages such as C# or Java. Below is an example code that defines a task to be executed by a web worker. As you can see it is a regular function defined globally, it accepts parameter of type WorkerArgs. This structure contains an input object which can be of any cloneable object type along with helper functions for the task's communication with the external environment. The purpose of the code is to determine whether a given number is prime or not.
</p>

```typescript
export interface WorkerArgs {
  data: any;
  done: Function;
  cancelled: Function;
  progress: Function;
  next: Function;
  error: Function;
}

export interface WorkerResult {
  status: 'success' | 'cancelled' | 'error';
  value?: any;
  error?: any;
}

export type WorkerTask = (args: WorkerArgs) => any | Promise<any>;

export function task({data, progress, cancelled, done}: WorkerArgs) {
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
      return;
    }
  }
  progress(1);
  done(true);
}
```
<p align="justify">
Another example of library use is an async function call. The code below shows the possible definition of a timer routine. As you may have noticed, this is not the case of progress notification, instead we use <i>next</i> method to inform the main thread about the current status of a timer. Task cancellation is an option. Although async function support is available, it is important to tune the build process of the application to ensure that async functions outlive the transpilation.
</p>

```typescript
export function timer({data, done, next, cancelled}: WorkerArgs) {
  next('timer set to ' + data + 'ms');

  let interval = setInterval(() => {
    data -= 1000;
    next('elapsed ' + data + 'ms');

    if(data <= 0) {
      clearInterval(interval);
      next('timer completed');
      done();
    }
    if(cancelled()) {
      clearInterval(interval);
      next('timer cancelled');
    }
  }, 1000);
}
```

<p align="justify">
Next is an example of instantiation of inline worker. To initiate the execution of a task we have to call run method of the worker. This method returns a promise object. Of course you can create multiple workers and run them in parallel. In this case you have to use Promise.all to wait for multiple asynchronous tasks to complete before doing something else.
</p>

```typescript
let worker: InlineWorker = new InlineWorker(task);

let promise = this.worker.progress((value) => console.log(value)).run(1234567890);
await Promise.all([worker])
```
<p align="justify">
The worker itself contains additionally some auxiliary methods that can brighten up your working routines. For instance, you can inject needed global functions into worker. Be aware, that this functionality is a bit sensitive to the method placement. So the methods from other files are decorated by webpack and that's why they cannot be used within worker. If you do not like the idea of cancellable workers or you have troubles with SharedBufferArray creation you can use terminate method which will silently kill the worker. To observe the progress of the execution, the callback function have to be passed as a parameter to progress method. 
</p>

<p align="justify">
I would like to think that this library will make it easier to write concurrent code, which is still considered a gimmick for the browser.
</p>

<p align="justify">
Stay tuned, and keep having fun with programming! Lines of code, like chapters in a book, come together to tell a story of your digital adventures.
</p>
