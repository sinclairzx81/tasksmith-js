# tasksmith-js

### task automation library for node

```js
const task = require('./tasksmith.js')

let mytask = () => task.series([
  task.shell("npm install"),
  task.shell("node app.js")
])

mytask().run()
```

## overview

tasksmith is minimal no dependency task runner for node that allows developers to 
script sophiticated workflows by composing them from smaller reusable tasks. 

## building from source
```
npm install typescript -g
node tasks build-all
```
## running tasks

To run a task, call its run() function.

```javascript
task.delay(1000)
    .run()
    .then(() => console.log("done"))
    .catch(error => console.log(error))

```
optionally, you can subscribe to any logging occuring during task execution.

```javascript
let mytask = task.series([
  task.ok   ("running task 1"),
  task.ok   ("running task 2"),
  task.fail ("running task 3"),
  task.ok   ("running task 4"),
])

// subscribe and run.
mytask.subscribe(event => {
  console.log(task.format(event))
}).run()

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

## core tasks

tasksmith provides a number of built in tasks, these tasks may be
run from within any javascript environment.

### delay
creates a task that will delay for the given number of milliseconds.

```javascript
let mytask = () => task.series([
  task.delay("waiting 1 second", 1000),
  task.delay("waiting 1 second", 1000),
  task.delay("waiting 1 second", 1000)
])
```

### dowhile
creates a task that repeats while a condition is true.
```javascript
let mytask = () => task.dowhile(next => next(true), () => task.series([
   task.ok("running 1"),
   task.ok("running 2"),
   task.ok("running 3")
]))
```

### fail
creates a task that immediately fails.
```javascript
let mytask = () => task.series([
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
    () => task.ok  ("running left"), 
    () => task.fail("running right"))
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
```
let mytask = task.ok()
```

### parallel
creates a task that runs its inner tasks in parallel.
```javascript
let mytask = () => task.parallel([
  task.delay("running 1", 1000),
  task.delay("running 2", 1000),
  task.delay("running 3", 1000),
])
```
### repeat
creates a task that repeats the given task for the given number of iterations.
```javascript
let mytask = () => task.repeat(10, (i) => task.series([
  task.ok(i + " -> 1 "),
  task.ok(i + " -> 2 "),
  task.ok(i + " -> 3 ")
]))
```

### retry

creates a retry task that attempts the inner task for the given number of retries, otherwise continue on ok.

```javascript
let mytask = () => task.retry(10, () => task.series([
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
let mytask = () => task.series([
  task.delay("running 1", 1000),
  task.delay("running 2", 1000),
  task.delay("running 3", 1000)
])
```

### timeout
creates a task that will fail if its inner task has not 
completed within the given number of milliseconds.
```javascript
let mytask = () => task.timeout(3000, () => task.series([
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

### drop

creates a task that recursively deletes a file or directory.

```javascript
let mytask = () => task.drop( "./file_or_directory")
```

### serve

creates a infinite task that serves static content for the given directory and provides live reload functionality.

note: because this task never finishes, run with other tasks within a parallel task block.

```javascript
let mytask = () => task.serve("./website", 5000, true)
```

### shell

creates a task that executes a shell command.

```javascript
let mytask = () => task.shell("npm install typescipt")
```

### watch

creates a infinite task that repeats changes to the given file or directory path. 

note: because this task never finishes, run with other tasks within a parallel task block.

```javascript
let mytask = () => task.parallel([
  task.watch("./file1.txt", () => task.ok("file1 changed")),
  task.watch("./folder1",   () => task.ok("folder1 changed"))
])
```

### cli

creates a task that creates a simple cli to run tasks by name from the command line.

the following is some example script for a task file named "mytasks.js".

```javascript
const task = require("./tasksmith.js")

let clean    = () => task.ok("running clean task.")
let install  = () => task.ok("running install task.")
let watch    = () => task.ok("running watch task.")
let build    = () => task.ok("running build task.")
let publish  = () => task.ok("running publish task.")

let cli = () => task.cli(process.argv, {
  "clean"   : clean(),
  "install" : install(),
  "watch"   : watch(),
  "build"   : build(),
  "publish" : publish()
})

cli().subscribe(event => {
  console.log(task.format(event))
}).run()
```
which can be run at the command line with.

```
node mytasks.js [name of task]
```