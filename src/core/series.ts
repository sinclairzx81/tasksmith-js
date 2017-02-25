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
 * creates a task that runs its inner tasks in series.
 * @param {() => Array<Task>} a function that returns an array of tasks.
 * @returns {Task}
 */
export function series(tasks: Array<Task>): Task

export function series(...args: any[]): Task {
  return create("core/series", context => signature(args)
    .err(err => context.fail(err))
    .map(["array"])
    .run((tasks: Array<Task>) => {
     
      // process ...
      let cancelled = false
      let current   = noop();

      (function step() {
        if(cancelled) return
        if(tasks.length === 0) {
          context.ok()
        } else {
          current = tasks.shift()
          current.run(data => context.log(data))
                 .then(() => step())
                 .catch(error => context.fail(error))
        }
      }())
      
      // abort ...
      context.abort(() => {
        cancelled = true
        current.cancel()
        tasks.forEach(task => task.cancel())
        context.fail("aborted")
      })
    }))
}