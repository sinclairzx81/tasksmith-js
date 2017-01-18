# tasksmith-js

## task automation library for node

```js
const task = require('./tasksmith.js')

let mytask = task.series(() => [
  task.shell("npm install"),
  task.shell("npm start")
])

mytask.run()
  .then(()     => console.log("ok"))
  .catch(error => console.log(error))

```

## overview

tasksmith is a zero dependency build automation tool for nodejs. tasksmith was primarily written
to allow for programatic orchestration of various command line utilities, particularly development time 
tooling (compilers, bundlers, minifiers, etc), but to also provide some directory / file provisioning 
services.

## building from source
```
npm install typescript -g
node tasks build
```
## running tasks

To run a task, call its run() function. The run() function returns a Promise type which the caller can learn of success or failure of the task.

```javascript
task.delay(1000)
    .run()
    .then(()     => console.log("done"))
    .catch(error => console.log(error))

```
All tasks emit various logging information, its possible to subscribe to the log events produced by a task with 
the following.

```javascript
let mytask = () => task.series(() => [
  task.ok   ("running task 1"),
  task.ok   ("running task 2"),
  task.fail ("running task 3"),
  task.ok   ("running task 4"),
])

// subscribe then run.
mytask().subscribe(event => console.log(event)).run()
```
the above code can be simplified with the debug function, which will write logging information out
to the environments console.
```javascript
let mytask = () => task.series(() => [
  task.ok   ("running task 1"),
  task.ok   ("running task 2"),
  task.fail ("running task 3"),
  task.ok   ("running task 4"),
])
// 
task.debug(mytask())
```
which outputs the following
```
15:37:11  start     core/series
15:37:11  start     core/ok
15:37:11  log       core/ok         running task 1
15:37:11  ok        core/ok
15:37:11  start     core/ok
15:37:11  log       core/ok         running task 2
15:37:11  ok        core/ok
15:37:11  start     core/fail
15:37:11  log       core/fail       running task 3
15:37:11  fail      core/fail
15:37:11  fail      core/series
```
note: the task.debug() function also returns a Promise.
## core tasks

tasksmith provides a number of built in tasks, these tasks may be
run from within any javascript environment.

### delay
creates a task that will delay for the given number of milliseconds.

```javascript
let mytask = () => task.series(() => [
  task.delay(1000),
  task.delay(1000),
  task.delay(1000)
])
```

### dowhile
creates a task that repeats while a condition is true.
```javascript
let mytask = () => task.dowhile(next => next(true), () => task.series(() => [
   task.ok("running 1"),
   task.ok("running 2"),
   task.ok("running 3")
]))
```

### fail
creates a task that immediately fails.
```javascript
let mytask = () => task.series(() => [
  task.ok  ("running 1"),
  task.ok  ("running 2"),
  task.fail("running 3")
])
```

### ifelse
creates a task that executes either left or right based on a condition.
```javascript
let mytask = () => task.ifelse(
    next => next(true), 
    ()   => task.ok  ("running left"), 
    ()   => task.fail("running right"))
```
### ifthen
creates a task that will run a inner task if a condition is true. otherwise ok.
```javascript
let mytask = () => task.ifthen(
    next => next(true), 
    ()   => task.ok ("only if true"))
```
### ok
returns a task that completes successfully.
```javascript
let mytask = () => task.ok()
```

### parallel
creates a task that runs its inner tasks in parallel.
```javascript
// run concurrently
let mytask = () => task.parallel(() => [
  task.delay(1000), 
  task.delay(1000),
  task.delay(1000)
])

```
### repeat
creates a task that repeats the given task for the given number of iterations.
```javascript
let mytask = () => task.repeat(10, () => task.ok())
```

### retry

creates a retry task that attempts the inner task for the given number of retries and fail if unable to complete.

```javascript
let mytask = () => task.retry(10, () => task.series(() => [
  task.ok(),
  task.ok(),
  task.fail()
]))
```

### script

creates a new script task. This is the primary extension point for tasksmith.

```javascript
let mytask = () => task.script("custom/task", context => {
  context.log("logging some info")
  context.ok()
  // or .. context.fail()
})
```

### series
creates a task that runs its inner tasks in series.
```javascript
// run sequentially.
let mytask = () => task.series(() => [
  task.delay(1000),
  task.delay(1000),
  task.delay(1000)
])
```

### timeout
creates a task that will fail if its inner task has not 
completed within the given number of milliseconds.
```javascript
let mytask = () => task.timeout(3000, () => task.series(() => [
  task.delay(1000),
  task.delay(1000),
  task.delay(1000), // !!!
  task.delay(1000),
  task.delay(1000)
]))
```

### trycatch
creates a task that will try the left task, and if fail, will fallback to the right task.
```javascript
let mytask = () => task.trycatch (
    () => task.fail ("this task will fail."),
    () => task.ok   ("so fallback to this task."))
```
## node tasks

The following tasks are specific to node.

### append

creates a task that appends a file with the given content.

```javascript
let mytask = () => task.append( "./file.dat", "this content will be appended.")
```

### concat

creates a task that concatinates multiple files to an output file.

```javascript
let mytask = () => task.concat( "./output.dat", ["file1.dat", "file2.dat", "file3.dat"])
```

### copy

creates a task that recursively copies a file or directory into a target directory.

```javascript
let mytask = () => task.copy( "./file_or_directory", "./target_directory")
```

### download

creates a task that downloads a http resource and saves it as the given filename.

```javascript
let mytask = () => task.download(
  "https://cdnjs.cloudflare.com/ajax/libs/three.js/r83/three.js", 
  "./scripts/three/three.js")
```

### drop

creates a task that recursively deletes a file or directory.

```javascript
let mytask = () => task.drop( "./file_or_directory")
```

### mkdir

creates a task that provisions a directory for use. if the directory already exists, no action is taken. directories are built 
recursively.

```javascript
let mytask = () => task.mkdir( "./some/directory")
```

### shell

creates a task that executes a shell command.

```javascript
let mytask = () => task.shell("npm install typescipt")
```

### touch

creates a empty file with the given path, if the file already exists, no action.

```javascript
let mytask = () => task.touch("./scripts/index.js")
```

### watch

creates a task that repeats its inner task on file system changes. 

```javascript
let mytask = () => task.watch("./website", () => task.ok("something changed."))
```

### cli

creates a task that creates a simple cli to run tasks by name from the command line.

the following is some example script for a task file named "mytasks.js".

```javascript
"use strict";

const task = require("./tasksmith.js")

const clean    = () => task.ok("running clean task.")
const install  = () => task.ok("running install task.")
const watch    = () => task.ok("running watch task.")
const build    = () => task.ok("running build task.")
const publish  = () => task.ok("running publish task.")

const cli = () => task.cli(process.argv, {
  "clean"   : clean(),
  "install" : install(),
  "watch"   : watch(),
  "build"   : build(),
  "publish" : publish()
})

task.debug(cli())

```
which can be run at the command line with.

```
node mytasks.js [name of task]
```