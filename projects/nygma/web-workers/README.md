# nygma-web-workers

<p align="center">
  <img src="https://raw.githubusercontent.com/oleksii-shepel/angular-inline-worker/master/projects/nygma/web-workers/emblem.png" alt="nygma" width="600"/>
</p>
  
  ![npm version](https://badge.fury.io/js/nygma-web-workers.svg)
  ![npm](https://img.shields.io/npm/dt/nygma-web-workers.svg)
  ![npm](https://img.shields.io/npm/l/nygma-web-workers.svg)

<p align="justify">
<b>nygma-web-workers</b> is a lightweight Javascript library that simplifies your interaction with web workers. Web workers allow you to perform true multi-threading and concurrency in your web applications. Inline web workers are web workers that are created in the same web page context or on the fly, without requiring a separate JavaScript file. The way you work with them is reminiscent of the use of thread objects in modern OOP languages such as C# or Java. Give you just a code example. 
</p>

```typescript

export function task(data: number, {progress, cancelled, done}: WorkerHelpers) {
  progress(0);
  let value = 0;
  for (var i = 2, len = data / 2 + 1; i < len; i++) {
    if(i / len - value > 0.01) {
      value = i / len;
      progress(value);

      if(cancelled()) {
        done();
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
```
<p align="justify">
As you can see it is a regular function defined globally, it accepts two parameters: an input object which can be of any cloneable object type and a structure with helper methods. If you are curious the function determines whether a given number is prime or not.
</p>

<p align="justify">
Another example of library utilization involves an asynchronous function call. The code below demonstrates one of possible definitions of a timer routine. This is not the case of progress notification as the example described earlier. Instead we use <i>next</i> method  to communicate the ongoing timer status to the main thread. It could seem that it is a method duplicate. Sure, but semantically it differs. In this context task cancellation is an option.
</p>

```typescript
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
      done();
    }
  }, 1000);
}
```

<p align="justify">
With a brief overview of the tasks, we're now prepared to create an inline worker instance. Nothing special, just a call of worker constructor with one parameter that represents task function. To initiate the execution we have to call run method. This method returns the promise object which is awaitable, so you can wait for task completeness.
</p>

```typescript
let worker: InlineWorker = new InlineWorker(task);

let promise = this.worker.progress((value) => console.log(value)).run(1234567890);
await Promise.all([worker])
```
<p align="justify">
Concerning the worker it makes sense to mention its auxiliary methods that can enhance your workflow. For instance, you can inject needed global functions into worker. One of the pitfalls here is the function decoration made by webpack. This case is already taken into account. If you do not like the idea of cancellation or you have troubles with SharedBufferArray creation you can use terminate method which will silently kill the worker. To observe the progress of the execution, the callback function have to be passed as a parameter to progress method. 
</p>

<p align="justify">
I would like to think that this library will make it easier to write concurrent code, which is still considered a gimmick for the browser. Potentially the library can be used with native async functions, but you have to tune the build process of the application to ensure that async functions outlive the transpilation. I have set up a <a href="https://github.com/oleksii-shepel/angular-babel-karma">skeleton</a> for such applications available on Github.
</p>

<p align="justify">
Stay tuned and have fun with programming! Lines of code, like chapters in a book, come together to tell a story of your digital adventures. ChatGPT doesn't lie.
</p>
