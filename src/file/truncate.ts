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

import { truncate as system_truncate } from "../system/file/truncate"
import { signature }                   from "../common/signature"
import { Task }                        from "../core/task"
import { create as create_task  }      from "../core/create"

/**
 * (synchronous) truncates the target file and writes the given content. if the target,
 * does not exist, this file is created.
 * @param {string} target the path of the file to truncate.
 * @param {string} content the content to write.
 * @returns {Task}
 */
export function truncate(target: string, content: string): Task

/**
 * (synchronous) truncates the target file. if the target, does not exist, this file is created.
 * @param {string} target the path of the file to truncate.
 * @returns {Task}
 */
export function truncate(target: string): Task

export function truncate(...args: any[]): Task {
  return create_task("file/truncate", context => signature(args)
    .err((err) => context.fail(err))
    .map(["string", "string"])
    .map(["string"], (target) => [target, ""])
    .run((target: string, content: string) => {
      try {
        system_truncate(target, content, data => context.log(data))
        context.ok()
      } catch (error) {
        context.fail(error)
      }
  }))
}