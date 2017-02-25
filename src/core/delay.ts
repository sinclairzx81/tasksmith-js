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



/**
 * creates a task that delays for the given millisecond timeout then runs the given task.
 * @param {number) ms the millisecond timeout.
 * @param {Task} task the task to run after this delay.
 * @returns {Task}
 */
export function delay(ms: number, task: Task): Task

/**
 * creates a task that delays for the given millisecond timeout.
 * @param {number) ms the millisecond timeout.
 * @returns {Task}
 */
export function delay(ms: number): Task


export function delay(...args: any[]): Task {
  return create("core/delay", context => signature(args)
    .err((err) => context.fail(err))
    .map(["number", "object"])
    .map(["number"], (ms) => [ms, undefined])
    .run((ms: number, task: Task) => {

      // process...
      const handle = setTimeout(() => {
        if(task === undefined) {
          context.ok()
        } else {
          task.run  (data  => context.log(data))
              .then (()    => context.ok())
              .catch(error => context.fail(error))
        }
      }, ms)
      
      // abort...
      context.abort(() => {
        clearTimeout(handle)
        if (task !== undefined)
          task.cancel()
        context.fail("aborted")
      })
  }))
}