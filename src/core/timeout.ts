/*--------------------------------------------------------------------------

tasksmith - task automation library for node.

The MIT License (MIT)

Copyright (c) 2015-2017 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

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

/**
 * creates a task that will fail if its inner task has not 
 * completed within the given number of milliseconds.
 * @param {number} the number of milliseconds before timeout.
 * @param {()=>ITask} a function to return a new task.
 * @returns {ITask}
 */
export function timeout (ms: number, taskfunc: () => ITask) : ITask;

/**
 * creates a task that will fail if its inner task has not 
 * completed within the given number of milliseconds.
 * @param {any[]} arguments.
 * @returns {ITask}
 */
export function timeout(...args: any[]): ITask {
  let param = signature<{
    ms      : number,
    taskfunc: () => ITask
  }>(args, [
      { pattern: ["number", "function"], map : (args) => ({ ms: args[0], taskfunc: args[1]  }) },
  ])
  return script("core/timeout", context => {
    let task     : ITask   = param.taskfunc()
    let cancelled: boolean = false
    let handle   : any     = setTimeout(() => task.cancel("timeout elaspsed."), param.ms)
    context.oncancel(reason => {
      cancelled = true
      clearTimeout(handle)
      task.cancel(reason)
      context.fail(reason)
    })
    task.subscribe(event => context.emit(event))
        .run()
        .then(()     => context.ok())
        .catch(error => context.fail(error))
  })
}