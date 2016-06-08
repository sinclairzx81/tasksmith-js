# tasksmith-js

### minimal task runner for node

```js
"use strict";

const task = require('./tasksmith.js')

let hello = () => task.shell("echo hello")
let world = () => task.script(t => {
  t.echo("world")
  t.done()
})
let app = task.series([
  hello(),
  world()
])

app().run()
```

### overview

tasksmith is a no dependency task library for node that allows developers quickly script 
sophisticated javascript and shell automation workflows. tasksmith supports the parallel execution
of shell / javascript task as blocks, making it useful for companion tooling for watch orientated
developer tooling as well as general project house keeping.

### core functions

tasksmith exposes four primary functions which all other functionality is built around.
```
script(..)     - runs some javascript
shell(..)      - runs a shell command
series([..])   - runs a block of tasks sequentially.
parallel([..]) - runs a block of tasks in parallel.
```
the following are a few examples.

```js

// run javascript.
task.script(t => {
  t.echo("hello")
  t.done()
})

// run shell command.
task.shell("echo hello")

// runs in series.
task.series([
  task.script(t => t.done()),
  task.script(t => t.done()),
  task.script(t => t.done())
])

// run in parallel.
task.parallel([
  task.shell("echo 1"),
  task.shell("echo 2"),
  task.shell("echo 3")
])

// example:
let program = task.series([
  // run this...
  task.script(t => {
    t.echo("running")
    t.done()
  })
  // then run this stuff in parallel.  
  task.parallel([ 
    task.script(t => t.done()),         
    task.script(t => t.done()),  
    task.script(t => t.done())         
  ]),      
  // then run this stuff in series.                                      
  task.series([                  
    task.shell("echo 1"),                      
    task.shell("echo 2"),       
    task.shell("echo 3")               
  ])                             
])

program.run()
```

### running tasks.

All tasks are observable event streams, any data emitted from the task (either by the shell process stdout, 
or the script echoing something) can be subscribed to. Useful for logging.

```js
let task = require('./tasksmith.js')

let program = task.series([ 
  task.echo("step 1"),
  task.echo("step 2"),
  task.echo("step 3"),
  task.echo("step 4"),
])

program.on("data",  data  => console.log(data))
       .on("error", error => console.log(error))
       .on("end",   ()    => console.log("done"))
       .run()
```

### cli

For convenience, tasksmith contains a small cli, useful for setting up tasks to interact with npm or other 
task running infrastructure.

```js
let program = task.cli(process.argv, {
  "install" : task.shell("install stuff"),
  "build"   : task.shell("build stuff"),
  "publish" : task.shell("publish stuff")
})

program.on("data",  data  => console.log(data))
       .on("error", error => console.log(error))
       .on("end",   ()    => console.log("done"))
       .run()
```
which can be run at the command line with.
```
node script.js [task]
```