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
 * @param {string} the file or directory to watch.
 * @param {number} sets the minimum delta time in which this watcher will react to fs signals (default is 1000)
 * @param {boolean} indicates if the watchers inner task should run immediate before waiting on system notification. (default is true)
 * @param {() => ITask} a function to return a task on each iteration.
 * @returns {ITask}
 */
export function watch(path: string, delay: number, immediate: boolean, taskfunc: () => ITask) : ITask

/**
 * creates a infinite task that repeats changes to the given file or directory path.
 * @param {string} the file or directory to watch.
 * @param {number} sets the minimum delta time in which this watcher will react to fs signals (default is 1000)
 * @param {() => ITask} a function to return a task on each iteration.
 * @returns {ITask}
 */
export function watch(path: string, delay: number, taskfunc: () => ITask) : ITask

/**
 * creates a infinite task that repeats changes to the given file or directory path.
 * @param {string} the file or directory to watch.
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
    path      : string,
    delay     : number,
    immediate : boolean,
    taskfunc  : () => ITask
  }>(args, [
      { pattern: ["string", "number", "boolean", "function"], map : (args) => ({ path: args[0], delay: args[1], immediate: args[2], taskfunc: args[3]  })  },
      { pattern: ["string", "number", "function"],            map : (args) => ({ path: args[0], delay: args[1], immediate: true,    taskfunc: args[2]  })  },
      { pattern: ["string", "function"],                      map : (args) => ({ path: args[0], delay: 1000,    immediate: true,    taskfunc: args[1]  })  }
  ])
  return script("node/watch", context => {
    let waiting  : boolean = true
    let task     : ITask   = null
    let completed: boolean = false;
    let cancelled: boolean = false;
    context.oncancel(reason => {
      cancelled = true
      if(task !== null) task.cancel(reason)
      context.fail(reason)
    })
    
    const next = () => {
      if(cancelled === true) return
      /**
       * wait:
       * The file system is liable to signal
       * hundreds of change events in quick 
       * succession.
       * 
       * Here we check if we are waiting on
       * a signal, and if so, set the waiting
       * flag to false.
       */
      if(waiting === true) {
        context.log("change detected.")
        waiting = false;
        
        /**
         * waiting timeout:
         * We set a timeout to switch the waiting
         * flag back to true. This timeout is tied
         * back to the delay parameter passed by 
         * the caller.
         */
        setTimeout(() => {waiting = true}, param.delay)

        /**
         * cancel:
         * A task may still be running when we receive
         * the change signal. Because of this, there is
         * a need to cancel to previous task before 
         * starting a new one. This prevents multiple
         * concurrent (and ultimately orphaned tasks)
         * from being lost.
         */
        if(task !== null && completed === false) {
          task.cancel("restarting.")
        }
        
        /**
         * execute and allow errors:
         * execute the task. We have a special case
         * here with regards to handling errors on the 
         * inner task. 
         * 
         * Essentially we say its ok for the inner task 
         * to have errors. The reason is, we do not wish
         * a watcher to fail due to its inner task failing,
         * instead, we want the watcher to re-run the task.
         */
        completed = false
        task      = param.taskfunc()
        task.subscribe(event => context.emit(event))
            .run()
            .then(()  => {completed = true})
            .catch(() => {completed = true})
      }
    }
    
    /**
     * run immediate:
     * sometimes, its nice to be able to run the
     * inner tasks before we receive a system from
     * the file system. In this instance, just 
     * kick off a the first task.
     */
    if(param.immediate === true) next()
    
    /**
     * start listening:
     * setup the fs watcher to run in 
     * recursive mode.
     */
    fs.watch(param.path, {recursive: true}, (event, filename) => next())
  })
}