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
 * creates a task that repeats the given task for the given number of iterations.
 * @param {string} a message to log.
 * @param {number} the number of iterations.
 * @param {() => ITask} a function to return a new task on each iteration.
 * @returns {ITask}
 */
export function repeat(message: string, iterations: number, taskfunc: (iteration: number) => ITask) : ITask 

/**
 * creates a task that repeats the given task for the given number of iterations.
 * @param {number} the number of iterations.
 * @param {() => ITask} a function to return a new task on each iteration.
 * @returns {ITask}
 */
export function repeat(iterations: number, taskfunc: (iteration: number) => ITask) : ITask 

/**
 * creates a task that repeats the given task for the given number of iterations.
 * @param {any[]} arguments
 * @returns {ITask}
 * @example
 * 
 * let mytask = task.repeat(10, (i) => task.series([
 *   task.ok(i + " -> 1 "),
 *   task.ok(i + " -> 2 "),
 *   task.ok(i + " -> 3 ")
 * ]))
 */
export function repeat(...args: any[]): ITask {
  let param = signature<{
    message    : string,
    iterations : number,
    taskfunc   : (iteration: number) => ITask
  }>(args, [
      { pattern: ["string", "number", "function"], map : (args) => ({ message: args[0], iterations: args[1], taskfunc: args[2]  })  },
      { pattern: ["number", "function"],           map : (args) => ({ message: null,    iterations: args[0], taskfunc: args[1]  })  },
  ])
  return script("core/repeat", context => {
    if(param.message !== null) context.log(param.message)
    let iteration = 0
    const next = () => {
      if(iteration === param.iterations) { context.ok(); }
      else {
        iteration += 1
        context.run( param.taskfunc(iteration) )
              .then(()     => next())
              .catch(error => context.fail(error.message))
      }
    }; next()    
  })
}