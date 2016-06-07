# tasksmith-js

### A lightweight no dependency task runner for node.

```js
"use strict";

const task = require("tasksmith")

let program = task.series([
  task.shell("npm install stuff"),
  task.script(observer => {
    observer.next("hello world")
    observer.end()
  })
])

program.pipe(process.stdout)

```

### overview

tasksmith is a minimal task based library that allows developers to setup fairly sohphisticated 
workflows that interact with the command line shell and javascript. Includes support for parallel execution of tasks.

### interface

tasksmith provides the following interface, where each method returns a task stream which can
be composed into larger units of work.

```
const task = require("tasksmith")

// executes this shell command.
task.shell("npm install something")

// executes this javascript.
task.script(observer => observer.end())

// executes these tasks in series.
task.series([
  task.shell("echo hello"),
  task.shell("echo world")
])

// executes these tasks in parallel.
task.parallel([
  task.shell("echo hello"),
  task.shell("echo world")
])


```
### streams

All tasksmith functions all return a stream which emits data either from the shell process's stdout, or the 
javascript function calling next(). This data can be observed in various ways. 

```js
// simple task setup, runs forever,
// and emits data from script and from
// the shell.
let program = task.parallel([ 
  task.script(observer => { 
    setInterval(() => observer.next("on and "), 1000)
  }),
  task.series([
    task.shell("echo 1"),
    task.shell("echo 2"),
    task.shell("echo 3"),
    task.shell("echo 4"),
  ])
])

// pipe the program to std out. this will 
// automatically start reading the the tasks
// stream and write to the given stream.
program.pipe(process.stdout)

// or, you can manually observe stream events. 
// note: you must call begin() to kick off the  
// stream.
program.on("data",  data  => console.log(data))
       .on("error", error => console.log(error))
       .on("end",   ()    => console.log("done"))
       .begin()

// or, for tasks that are known to complete, you can 
// convert to a promise and run a task this way. 
task.shell("npm")
    .promise(true) // true to buffer, 
    .then(buf    => process.stdout.write(buf.join("")))
    .catch(error => console.log(error))

// note: buffered data is given as a array, callers may
// wish to join().
```

### cli

for convenience, tasksmith contains a small cli for running tasks from the command line. 
The following writes any output to stdout.

```js
let program = task.cli(process.argv, {
  "install" : task.shell("install stuff"),
  "build"   : task.shell("build stuff"),
  "publish" : task.shell("publish stuff")
})

program.pipe(process.stdout)
```
which can be run at the command line with.
```
node script.js [task]
```