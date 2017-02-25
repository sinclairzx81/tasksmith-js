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

import { create as system_create }  from "../system/folder/create"
import { signature }                from "../common/signature"
import { Task }                     from "../core/task"
import { create as task_create }    from "../core/create"

/**
 * (synchronous) creates the given target directory recursively. If the target directory already 
 * exists, no action. If the target directory points to a file, raise error, otherwise create.
 * @param {string} target the directory to create.
 * @returns {Task}
 */
export function create(target: string): Task


export function create(...args: any[]): Task {
  return task_create("folder/create", context => signature(args)
  .err((err) => context.fail(err))
  .map(["string"])
  .run((target: string) => {
    try {
      system_create(target, data => context.log(data))
      context.ok()
    } catch(error) {
      context.fail(error)
    }
  }))
}