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
 * creates a task tries to run the left task, if fail, run the right.
 * @param {() => Task} tryfunc the try task.
 * @param {() => Task} catchfunc the catch task.
 * @returns {Task}
 */
export function trycatch(tryTask: Task, catchTask: Task): Task

/**
 * creates a task tries to run the left task, if fail, just continue.
 * @param {() => Task} tryfunc the try task.
 * @returns {Task}
 */
export function trycatch(tryTask: Task): Task

export function trycatch(...args: any[]): Task {
  return create("core/trycatch", context => signature(args)
    .err((err) => context.fail(err))
    .map(["object", "object"])
    .map(["object"], (tryTask) => [tryTask, noop()])
    .run((tryTask: Task, catchTask: Task) => {

      // process ... 
      tryTask.run(data => context.log(data))
        .then(() => context.ok())
        .catch(error => {
          catchTask.run(data    => context.log(data))
                   .then(()     => context.ok())
                   .catch(error => context.fail(error))
        })

      // abort ...
      context.abort(() => {
        tryTask.cancel()
        catchTask.cancel()
        context.fail("aborted")
      })
    }))
}