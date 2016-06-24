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
 * creates a retry task that attempts the inner task for the given number of retries, otherwise continue on ok.
 * @param {string} a message to log.
 * @param {number} the number of retries.
 * @param {() => ITask} a function to return a new task on each iteration.
 * @returns {ITask}
 */
export function retry(message: string, retries: number, taskfunc: (iteration: number) => ITask) : ITask 

/**
 * creates a retry task that attempts the inner task for the given number of retries, otherwise continue on ok.
 * @param {number} the number of retries.
 * @param {() => ITask} a function to return a new task on each iteration.
 * @returns {ITask}
 */
export function retry(retries: number, taskfunc: (iteration: number) => ITask) : ITask 

/**
 * creates a retry task that attempts the inner task for the given number of retries, otherwise continue on ok.
 * @param {any[]} arguments
 * @returns {ITask}
 * @example
 * 
 * let mytask = task.retry(10, (i) => task.series([
 *   task.ok  (i + " -> 1 "),
 *   task.ok  (i + " -> 2 "),
 *   task.fail(i + " -> 3 ")
 * ]))
 */
export function retry(...args: any[]): ITask {
  let param = signature<{
    message    : string,
    retries    : number,
    taskfunc   : (iteration: number) => ITask
  }>(args, [
      { pattern: ["string", "number", "function"], map : (args) => ({ message: args[0], retries: args[1], taskfunc: args[2]  })  },
      { pattern: ["number", "function"],           map : (args) => ({ message: null,    retries: args[0], taskfunc: args[1]  })  },
  ])
  return script("core/retry", context => {
    if(param.message !== null) context.log(param.message)
    let iteration = 0
    const next = () => {
      if(iteration === param.retries) { context.fail(); }
      else {
        iteration += 1
        context.run( param.taskfunc(iteration) )
              .then(()     => context.ok())
              .catch(error => next())
      }
    }; next()    
  })
}