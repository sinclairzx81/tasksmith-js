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

import { signature }  from "../common/signature"
import { Task }       from "./task"
import { create }     from "./create"
import { noop }       from "./noop"

/**
 * creates a if/else task where the left or right task is run based on the given condition.
 * @param {boolean} condition a boolean value.
 * @param {Task} ifTask the task to run if the condition is true.
 * @param {Task} elseTask the task to run if the condition is false.
 * @returns {Task}
 */
export function ifelse(condition: boolean, ifTask: Task, elseTask: Task): Task

/**
 * creates a if/else task which will run the given task only if the condition is true.
 * @param {boolean} condition a boolean value.
 * @param {Task} ifTask the task to run if the condition is true.
 * @returns {Task}
 */
export function ifelse(condition: boolean, ifTask: Task): Task


export function ifelse(...args: any[]): Task {
  
  return create("core/ifelse", context => signature(args)
    .err((err) => context.fail(err))
    .map(["boolean", "object", "object"])
    .map(["boolean", "object"], (condition, ifTask) => [condition, ifTask, noop()])
    .run((condition: boolean, ifTask: Task, elseTask: Task) => {

      if(condition) {
          ifTask.run  (data  => context.log(data))
                .then (()    => context.ok())
                .catch(error => context.fail(error))
      } else {
          elseTask.run  (data  => context.log(data))
                  .then (()    => context.ok())
                  .catch(error => context.fail(error))
      }
      
      context.abort(() => {
        ifTask.cancel()
        elseTask.cancel()
        context.fail("aborted")
      })
  }))
}