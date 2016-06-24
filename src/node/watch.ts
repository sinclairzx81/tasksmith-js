/*--------------------------------------------------------------------------

tasksmith - task automation library for node.

The MIT License (MIT)

Copyright (c) 2015-2016 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

---------------------------------------------------------------------------*/

/// <reference path="./node.d.ts" />

import {signature}        from "../common/signature"
import {ITask}            from "../core/task"
import {script}           from "../core/script"
import * as fs            from "fs"


/**
 * creates a infinite task that repeats changes to the given file or directory path.
 * @param {string} a message to log.
 * @param {string} the file or directory path to watch.
 * @param {boolean} indicates if the watchers inner task should run immediate before waiting on system notification. default is true.
 * @param {() => ITask} a function to return a task on each iteration.
 * @returns {ITask}
 */
export function watch(message: string, path: string, immediate: boolean, taskfunc: () => ITask) : ITask

/**
 * creates a infinite task that repeats changes to the given file or directory path.
 * @param {string} the file or directory path to watch.
 * @param {boolean} indicates if the watchers inner task should run immediate before waiting on system notification. default is true.
 * @param {() => ITask} a function to return a task on each iteration.
 * @returns {ITask}
 */
export function watch(path: string, immediate: boolean, taskfunc: () => ITask) : ITask

/**
 * creates a infinite task that repeats changes to the given file or directory path.
 * @param {string} a message to log.
 * @param {string} the file or directory path to watch.
 * @param {() => ITask} a function to return a task on each iteration.
 * @returns {ITask}
 */
export function watch(message: string, path: string, taskfunc: () => ITask) : ITask

/**
 * creates a infinite task that repeats changes to the given file or directory path.
 * @param {string} the file or directory path to watch.
 * @param {() => ITask} a function to return a task on each iteration.
 * @returns {ITask}
 */
export function watch(path: string, taskfunc: () => ITask) : ITask

/**
 * creates a infinite task that repeats changes to the given file or directory path.
 * @param {string} a message to log.
 * @param {string} the file or directory path to watch.
 * @param {() => ITask} a function to return a task on each iteration.
 * @returns {ITask}
 */
export function watch(...args: any[]) : ITask {
  let param = signature<{
    message  : string,
    path     : string,
    immediate: boolean,
    taskfunc : () => ITask
  }>(args, [
      { pattern: ["string", "string",  "boolean", "function"], map : (args) => ({ message: args[0], path: args[1], immediate: args[2], taskfunc: args[3]  })  },
      { pattern: ["string", "boolean", "function"],            map : (args) => ({ message: null,    path: args[0], immediate: args[1], taskfunc: args[2]  })  },
      { pattern: ["string", "string",  "function"],            map : (args) => ({ message: args[0], path: args[1], immediate: true,    taskfunc: args[2]  })  },
      { pattern: ["string", "function"],                       map : (args) => ({ message: null,    path: args[0], immediate: true,    taskfunc: args[1]  })  }
  ])
  return script("node/watch", context => {
    if(param.message !== null) context.log(param.message)
    let waiting_on_signal = true
    const runtask = () => {
      if(waiting_on_signal === true) {
        waiting_on_signal = false
        let task    = param.taskfunc()
        context.run(task)
               .then(()     => {waiting_on_signal = true})
               .catch(error => context.fail(error))
      }
    }
    if(param.immediate === true) runtask()
    fs.watch(param.path, {recursive: true}, (event, filename) => runtask())
  })
}