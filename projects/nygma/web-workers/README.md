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
    }
  }, 1000);
}
```

<p align="justify">
Initializing a worker isn't complicated either. You simply specify a function to call and set up callbacks for worker events. After that, you pass your parameters to the task and wait for it to complete.  
</p>

```typescript
let worker: WebWorker = new InlineWorker(task);

let promise = this.worker.progress((value) => console.log(value)).run(1234567890);
await Promise.all([worker])
```
<p align="justify">
That's it. In addition, you can inject helper methods into the worker body. Seems like it is an prominent feature among the obvious shortcomings. The inline worker supports native async functions, but you have to tune the build process of the application to ensure that async functions outlive the transpilation. I have set up a <a href="https://github.com/oleksii-shepel/angular-babel-karma">skeleton</a> for such applications available on Github.
</p>

What else? How about the use of webpack chunks as workers instead? Sounds promising. In fine we will have the worker that can be async, can import functionality from other modules, can contain class definitions and use object instances. Obviously we can benefit from having control over bundling process. Potentially we can remove sensitive information from the module and inject it right before the execution, if it weren't the ability to view the content of the blobs in the browser. So let me introduce my own worker type: ModuleWorker. 
</p>
<p align="justify">
Firstly, I have to state that the solution is viable and stable. After all the development process I have become a worker that is performant enough and can be lazy-loaded and there are no analogs. Using the module worker is no different from an inline worker. I tried to keep the proposed interface for interacting with the worker. And I did it. The only difference we have is found in a constructor call. Let's look at the worker definition:
</p>

```typescript
let worker: WebWorker = new ModuleWorker('./webworker.js', 'timer');

let promise = this.worker.progress((value) => console.log(value)).run(10000);
await Promise.all([worker])
```
<p align="justify">
The worker constructor takes as parameters the path to the generated worker chunk and the name of worker method. So you can reuse the same module with different worker methods. The second parameter is optional and in case there is only one method defined in the module or default method specified, it can be resolved automatically. The worker method definition is preserved and all the description above suits to the new worker type. The only condition to met is the use of Webpack as a bundler.
</p>
<p align="justify">
Setting up the bundler is not difficult at all. You specify a new entry point for the worker and disable one of the optimizations associated with the used exports (usedExports: false). You don't need to embed the chunk in the index page as it will be loaded on demand. To suffix the name of the chunk with a hash look towards DefinePlugin, so you can get access to it through process.env variable. Finally, you have the opportunity to choose the right solution according to your needs. Thank you for reading.
</p>

<p align="justify">
I would like to think that this library will make it easier to write concurrent code, which is still considered a gimmick for the browser. Stay tuned and have fun with programming! Lines of code, like chapters in a book, come together to tell a story of your digital adventures... 
ChatGPT doesn't lie.
</p>
