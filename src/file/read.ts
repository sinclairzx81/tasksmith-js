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

import { read as system_read } from "../system/file/read"
import { signature }           from "../common/signature"
import { Task }                from "../core/task"
import { create }              from "../core/create"
import { noop }                from "../core/noop"

/**
 * (synchronous) reads the given target and returns its contents.
 * @param {string} target the path of the file to read.
 * @returns {Task}
 */
export function read(target: string, func: (content: string) => Task): Task

export function read(...args: any[]): Task {
  return create("file/read", context => signature(args)
    .err((err) => context.fail(err))
    .map(["string", "function"])
    .run((target: string, func: (content: string) => Task) => {
      
      let content = ""
      let task    = noop()

      try {
        content = system_read(target, "utf8", data => context.log(data)) as string
      } catch (error) {
        context.fail(error)
        return
      }

      task = func(content)
      task.run(data => context.log(data))
        .then(() => context.ok())
        .catch(error => context.fail(error))

      // abort...
      context.abort(() => {
        task.cancel()
        context.fail("aborted")
      })
    }))
}