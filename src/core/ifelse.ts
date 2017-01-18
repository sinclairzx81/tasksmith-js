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
 * a next function, passed to resolve to asynchronously resolve values.
 */
export interface NextFunction<T> {
  (value: T) : void
}

/**
 * a resolve function used for asynchronous resolution of values.
 */
export interface ResolveFunction<T> {
  (next: NextFunction<T>): void
}

/**
 * creates a task that executes either left or right based on a condition.
 * @param {ResolveFunction<boolean>} function to asynchronous resolve a condition.
 * @param {()=>ITask} a function that returns a new task when true.
 * @param {()=>ITask} a function that returns a new task when false.
 * @returns {ITask}
 */
export function ifelse (condition: ResolveFunction<boolean>, left: ()=> ITask, right: () => ITask) : ITask;

/**
 * creates a task that executes either left or right based on a condition.
 * @param {any[]} arguments
 * @returns {ITask}
 * @example
 * 
 * let mytask = task.ifelse(next => next(true), 
 *                          ()   => task.ok  ("running left"), 
 *                          ()   => task.fail("running right"))
 */
export function ifelse(...args: any[]) : ITask {
  let param = signature<{
    condition : ResolveFunction<boolean>
    left      : () => ITask,
    right     : () => ITask
  }>(args, [
      { pattern: ["function", "function", "function"],  map: (args) => ({ condition: args[0], left: args[1], right: args[2]  })  },
  ])
  return script("core/ifelse", context => {
    let task      : ITask    = null
    let cancelled : boolean  = false
    context.oncancel(reason => {
      cancelled = true
      if(task !== null) task.cancel(reason)
      context.fail(reason)
    })
    
    param.condition(result => {
      if(cancelled === true) return
      task = (result) ? param.left() : param.right()
      task.subscribe(event => context.emit(event))
          .run   ()
          .then  (()    => context.ok())
          .catch (error => context.fail(error))
    })
  })
}