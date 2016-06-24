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
import {Promise}   from "../common/promise"
import {signature} from "../common/signature"
import {ITask}     from "./task"
import {script}    from "./script"

/**
 * creates a task that runs its inner tasks in parallel.
 * @param {string} a message to log.
 * @param {Array<Task>} an array of tasks to run in parallel.
 * @returns {ITask}
 */
export function parallel (message: string, tasks: Array<ITask>) : ITask;

/**
 * creates a task that runs its inner tasks in parallel.
 * @param {Array<Task>} an array of tasks to run in parallel.
 * @returns {ITask}
 */
export function parallel (tasks: Array<ITask>) : ITask;

/**
 * creates a task that runs its inner tasks in parallel.
 * @param {any[]} arguments
 * @returns {ITask}
 * @example
 * 
 * let mytask = () => task.parallel([
 *  task.delay("1", 1000),
 *  task.delay("2", 1000),
 *  task.delay("3", 1000),
 * ])
 */
export function parallel (...args: any[]) {
  let param = signature<{
    message  : string,
    tasks    : Array<ITask>
  }>(args, [
      { pattern: ["string", "array"], map : (args) => ({ message: args[0], tasks: args[1]  })  },
      { pattern: ["array"],           map : (args) => ({ message: null,    tasks: args[0]  })  },
  ])
  return script("core/parallel", context => {
    if(param.message !== null) context.log(param.message)
    let thenables = param.tasks.map(task => context.run(task))
    Promise.all(thenables)
            .then (()    => context.ok())
            .catch(error => context.fail(error))
  })
}