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

import {signature} from "../common/signature"
import {ITask}     from "./task"
import {script}    from "./script"
import {ok}        from "./ok"

/**
 * creates a task that will delay for the given number of milliseconds then run its inner task.
 * @param {ms} the number of milliseconds to delay.
 * @param {() => ITask} A task to run after the delay has elapsed.
 * @returns {ITask}
 */
export function delay (ms: number, taskfunc: () => ITask) : ITask

/**
 * creates a task that will delay for the given number of milliseconds.
 * @param {ms} the number of milliseconds to delay.
 * @returns {ITask}
 */
export function delay (ms: number) : ITask

/**
 * creates a task that will delay for the given number of milliseconds.
 * @param {any[]} arguments
 * @returns {ITask}
 */
export function delay (...args: any[]) : ITask {
  let param = signature<{
    ms      : number,
    taskfunc: () => ITask
  }>(args, [
    { pattern: ["number", "function"], map : (args) => ({ ms: args[0], taskfunc: args[1]     })  },
    { pattern: ["number"],             map : (args) => ({ ms: args[0], taskfunc: () => ok()  })  },
  ])
  return script("core/delay", context => {
    let cancelled = false
    
    /**
     * timeout: 
     * set timeout for delay, once
     * elapsed, check if we havent
     * cancelled, and if not, execute
     * inner task.
     */
    let timeout = setTimeout(() => {
      if(cancelled === true) return
      let task = param.taskfunc()
      task.subscribe(event => context.emit(event))
          .run  ()
          .then (()      => context.ok())
          .catch((error) => context.fail(error))
    }, param.ms)

    /**
     * cancel:
     * listen out for cancellation.
     */
    context.oncancel(reason => {
      cancelled = true
      clearTimeout(timeout)
      context.fail(reason)
    })
  })
}