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
 * creates a task that will try the left task, and if fail, will fallback to the right task.
 * @param {() => ITask} a function to return the left task.
 * @param {() => ITask} a function to return the right task.
 * @returns {ITask}
 */
export function trycatch(left: () => ITask, right : () => ITask) : ITask;

/**
 * creates a task that will try the left task, and if fail, will fallback to the right task.
 * @param {() => ITask} a function to return the left task.
 * @param {() => ITask} a function to return the right task.
 * @returns {ITask}
 * @example
 * 
 * let mytask = task.trycatch(() => task.fail ("this task will fail."),
 *                            () => task.ok   ("so fallback to this task."))
 */
export function trycatch(...args: any[]) : ITask {
  let param = signature<{
    left      : () => ITask,
    right     : () => ITask
  }>(args, [
      { pattern: ["function", "function"], map : (args) => ({ left: args[0], right: args[1]  })  },
  ])
  return script("core/trycatch", context => {
    let left      : ITask   = param.left()
    let right     : ITask   = null
    let cancelled : boolean = false
    context.oncancel(reason => {
      cancelled = true
      if(left  !== null) left.cancel  (reason)
      if(right !== null) right.cancel (reason)
      context.fail(reason)
    })

    left.subscribe(event => context.emit(event))
        .run() 
        .then(()  => context.ok())
        .catch(() => {
          if(cancelled === true) return
          let right = param.right()       
          right.subscribe(event => context.emit(event))
               .run()
               .then(()     => context.ok())
               .catch(error => context.fail(error))
        })
  })
}