## tasksmith

A task automation workflow library for node.

```javascript
task.series([
  task.shell("ping google.com"),
  task.shell("echo hello"),
  task.shell("echo world"),
  task.shell("npm install express")
]).run(task.debug)

```

### overview

tasksmith is a control flow automation library for node built to help automate running command line processes in
scenarios where workflows need to be executed in a sophisticated, potentially non linear fashion. tasksmith focuses 
on achieving this through various control flow constructs (series/parallel/loop/repeat/retry/trycatch/ifelse/etc) and 
supports both sequential and parallel execution of processes. tasksmith provides a number of looping constructs, task 
cancellation, delay / deferral and conditional branching, all of which composable through tasksmiths various task 
abstractions.


### tasksmith tasks

The following table lists all the tasks built into tasksmith.

task                   | signature                                                     | description
---                    | ---                                                           | ---                                                                   |
task.cli               | (argv:string[], options: {[name: string]: Task}) => Task      | creates a task that provides a simple cli to run tasks from the command line |
task.create            | (name: string, (context: Context) => void) => Task            | creates a user defined task. |
task.delay             | (ms: number, () => Task) => Task                              | creates a task that delays for the given number of milliseconds.      |
task.each              | (elements: Array&lt;T&gt;, func: (element: T) => Task) : Task | creates a repeating task that enumerates each element in the given sequence. |
task.fail              | (reason:string)  => Task                                      | creates a task that fails immediately.                                |
task.ifelse            | (() => boolean, () => Task, () => Task)=> Task                | creates a task that runs the left or right task based on a condition. |
task.noop              | () => Task                                                    | creates a noop task. same as task.core.ok() task.                     |
task.ok                | () => Task                                                    | creates a task that succeeds immediately.                             |
task.parallel          | (() => Array&lt;Task&gt;) => Task                             | creates a inner task runs its inner tasks in parallel.                |
task.repeat            | (iterations: number, () => Task) => Task                      | creates a task that repeats for the given number of iterations. |
task.retry             | (attempts: number, () => Task) => Task                        | creates a task that retries up to the given number of attempts. |
task.series            | (() => Array&lt;Task&gt;) => Task                             | creates a task that runs its inner tasks in series. |
task.shell             | (command: string, exitcode: number): Task                     | runs the given shell command with the given expected exitcode. |
task.timeout           | (ms: number, () => Task) => Task                              | creates a task that fails if its inner task has not completed within the given millisecond timeout. |
task.trycatch          | (() => Task, () => Task) => Task                              | creates a task that attempts the left task, and defers to the right task on fail. |
task.watch             | (path: string, () => Task) => Task                            | creates a task that repeats its inner task on file system watch events. |
task.file.append       | (target: string, content: string) => Task                     | creates a task that appends the target file with the given content. |
task.file.concat       | (output: string, inputs: Array&lt;string&gt;) => Task         | creates a task that concatinates the given input paths into the output path. |
task.file.copy         | (source: string, target: string) => Task                      | creates a task that copies the source file into the target directory. |
task.file.create       | (target: string) => Task                                      | creates a task that creates the target file if it doesn't exist. |
task.file.drop         | (target: string) => Task                                      | creates a task that deletes the target file if it exists. |
task.file.move         | (source: string, target: string) => Task                      | creates a task that moves the given source file into the given target directory. |
task.file.read         | (target: string, func: (content: string) => Task): Task       | reads the given target and returns its contents. |
task.file.rename       | (target: string, newname: string): Task                       | creates a task that renames the given target file to the given new name. |
task.file.replaceText  | (target: string, token: string, replacement: string) => Task  | creates a task that runs a token replacement for the given file. |
task.file.truncate     | (target: string, content: string): Task                       | creates a task that truncates the target file and writes the given content. if the target |
task.folder.copy       | (source: string, target: string) => Task                      | creates a task that copies the source directory into the target. |
task.folder.create     | (target: string) => Task                                      | creates a task that creates the target directory if not exists. |
task.folder.drop       | (target: string) => Task                                      | creates a task that deletes the target directory if not exists. |
task.folder.merge      | (source: string, target: string): Task                        | merges the contents from the source directory into the target directory. |
task.folder.move       | (source: string, target: string): Task                        | creates a task that moves the given source directory into the the given target directory. |
task.folder.rename     | (target: string, newname: string) => Task                     | creates a task that renames the target directory. |
task.http.get          | (endpoint: string, func: (content: string) => Task): Task     | creates a task that gets the http content from the remote endpoint. | 


### running tasks

To run a task, call a tasks run() method. this method returns a Promise which the caller can use to learn of the success 
or failure of the task. The run() method accepts a function to receive logging information from the task.

```javascript
let mytask = () => task.ok()

mytask.run(console.log)
  .then(() => {...})
  .catch(e => {...})
```

### debugging tasks

tasksmith tasks may emit a wealth of information about task. This information can be useful for debugging tasks, however
by default, the logging information is emitted in a unformatted fashion which may become confusing for complex tasks. As 
such, tasksmith provides a debugging function available with ```task.debug``` which can be passed to the tasks
run function.

```javascript
let mytask = () => task.ok()

mytask.run(task.debug) // 
  .then(() => {...})
  .catch(e => {...})
```

### cancelling tasks

tasksmith tasks support cancellation through a tasks ```cancel()``` method. task cancellation is non trivial in javascript,
and some tasks may or may not be cancellable. In tasksmith, a call to cancel is a signal into the running task that the 
caller intended to cancel, but the task may or may not choose to honor that request for cancellation. Instances of tasks
that may not cancel are tasks that complete synchronously, or complete immediately. In addition, task cancellation does
not involve rollback. As a general rule, a user can expect a task to terminate gracefully on cancel().

```javascript
let mytask = () => task.series(() => [
  task.delay(1000, () => task.file.create("./file1.dat")), // 1 second
  task.delay(1000, () => task.file.create("./file2.dat")), // 2 second
  task.delay(1000, () => task.file.create("./file3.dat")), // 3 second
])

task.run()

// may have created some files along the way.

task.cancel()
```

### user defined tasks

user defined tasks can be created in the following way. note that the first parameter is used to scope the task with
a given name, the convention ```type/action``` is used but not required. The ```create()``` function also takes a handler
function which is passed a context for fulfilling this task, detailed below.

```javascript
let mytask = () => task.create("custom/mytask", context => {
  //------------------------------------------------------------
  // context.ok()          - completes this task.
  // context.fail()        - fails this task.
  // context.log(message)  - logs a message for this task. 
  // context.abort(handle) - handles a signal for cancellation.
  //------------------------------------------------------------

  context.ok()

  context.abort(() => {
    // clean up the task.
    context.fail()
  })
})
```

The ```abort()``` function is optional and may be ignored if the task doesn't support cancellation, however if implementing
cancellation, the task should clean up any resources created by the task and either ```ok()``` or ```fail()``` the task. Note,
that the ```abort()``` function will only be called once, and only if the task is in a non completed or ```running``` state.

### license 

MIT