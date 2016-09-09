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
 * signature for the series function.
 */
export interface SeriesFunc {
  () : Array<ITask>
}

/**
 * creates a task that runs its inner tasks in series.
 * @param {Array<Task>} an array of tasks to run in parallel.
 * @returns {ITask}
 */
export function series (tasks: Array<ITask>) : ITask;

/**
 * returns a task that executes an array of tasks in series.
 * @param {any[]} arguments.
 * @returns {ITask}
 * @example
 * 
 * let mytask = () => task.series([
 *  task.delay("1", 1000),
 *  task.delay("2", 1000),
 *  task.delay("3", 1000),
 * ])
 */
export function series (...args: any[]) : ITask {
  let param = signature<{
    func   : SeriesFunc
  }>(args, [
      { pattern: ["function"], map : (args) => ({ func: args[0]  }) },
  ])
  return script("core/series", context => {

    let task     : ITask   = null
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
      if(task !== null) task.cancel(reason)
      context.fail(reason)
    })
    
    const next = () => {
      if(cancelled === true) return
      if (tasks.length === 0) {
        context.ok()
        return
      }
      
      task = tasks.shift()
      task.subscribe(event => context.emit(event))
          .run      ()
          .then     (next)
          .catch    (error => context.fail(error))
    }; next()
  })
}
