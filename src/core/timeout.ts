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

/**
 * creates a task that will fail if its inner task has not 
 * completed within the given number of milliseconds.
 * @param {string} a message to log.
 * @param {number} the number of milliseconds before timeout.
 * @param {()=>ITask} a function to return a new task.
 * @returns {ITask}
 */
export function timeout (message: string, ms: number, taskfunc: () => ITask) : ITask;

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
 * @example
 * 
 * let mytask = task.timeout(3000, () => task.series([
 *    task.delay(1000),
 *    task.delay(1000),
 *    task.delay(1000),
 *    task.delay(1000),
 *    task.delay(1000)
 * ]))
 */
export function timeout(...args: any[]): ITask {
  let param = signature<{
    message : string,
    ms      : number,
    taskfunc: () => ITask
  }>(args, [
      { pattern: ["string", "number", "function"], map : (args) => ({ message: args[0], ms: args[1], taskfunc: args[2]  }) },
      { pattern: ["number", "function"],           map : (args) => ({ message: null,    ms: args[0], taskfunc: args[1]  }) },
  ])
  return script("core/timeout", context => {
    if(param.message !== null) context.log(param.message)
    const timeout = setTimeout(() => context.fail("timeout elapsed."), param.ms)
    context.run(param.taskfunc())
          .then(()     => context.ok())
          .catch(error => context.fail(error))
  })
}