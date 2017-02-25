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


export interface TaskOptions {
  [name: string]: Task
}
/**
 * creates a repeating task that enumerates each element in the given sequence.
 * @param {Array<string>} argv process.argv.
 * @param {TaskOptions} options a dictionary of names of tasks.
 * @returns {Task}
 */
export function cli<T>(argv: Array<string>, options: TaskOptions) : Task


export function cli (...args: any[]): Task {
  return create("core/cli", context => signature(args)
    .err((err) => context.fail(err))
    .map(["array", "object"])
    .run((argv: Array<any>, options: TaskOptions) => {
      let argument = argv.slice(2)

      // catch no options or option not found.
      if(argument.length === 0 || options[argument[0]] === undefined) {
        context.log("cli options:")
        Object.keys(options).forEach(key => context.log(` - ${key}`))
        context.ok()
        return
      }
      
      // run task.
      context.log(`running task: ${argument[0]}`)
      let cancelled = false
      let current:Task = options[argument[0]]
      current.run  (data  => context.log(data))
             .then (()    => context.ok())
             .catch(error => context.fail(error))
      
      // abort...
      context.abort(() => {
        cancelled = true
        current.cancel()
        context.fail("aborted")
      })
    })
  )
}