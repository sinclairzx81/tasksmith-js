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

import {Promise}   from "../common/promise"
import {signature} from "../common/signature"
import {ITask}     from "./task"
import {script}    from "./script"

export interface ParallelFunc {
  () : Array<ITask>
}

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
 */
export function parallel (...args: any[]) {
  let param = signature<{
    func    : ParallelFunc
  }>(args, [
      { pattern: ["function"], map : (args) => ({ func: args[0]  })  },
  ])
  return script("core/parallel", context => {
    let completed: number  = 0
    let cancelled: boolean = false
    let tasks = null

    try {
      tasks = param.func()
    } catch(e) {
      context.fail(e)
      return
    }
    
    context.oncancel(reason => {
      cancelled = true
      tasks.forEach(task => task.cancel(reason))
      context.fail(reason)
    })
    
    tasks.forEach(task => {
      task.subscribe(event => context.emit(event))
          .run  ()
          .then (()    => { completed += 1; if(completed === tasks.length) { context.ok() } })
          .catch(error => context.fail(error))
    })
  })
}