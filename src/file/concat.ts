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

import { concat as system_concat } from "../system/file/concat"
import { signature }               from "../common/signature"
import { Task }                    from "../core/task"
import { create }                  from "../core/create"


/**
 * (synchronous) concatinates the given sources into the given target. if the target does not 
 * exist, the target is created. If the target does exist, the target is overwritten.
 * @param {string} target the target file.
 * @param {string} sources the source files to concatinate.
 * @param {string} seperator a file join seperator.
 * @returns {Task}
 */
export function concat(target: string, sources: string, seperator: string): Task

/**
 * (synchronous) concatinates the given sources into the given target. if the target does not 
 * exist, the target is created. If the target does exist, the target is overwritten.
 * @param {string} target the target file.
 * @param {string} sources the source files to concatinate.
 * @returns {Task}
 */
export function concat(target: string, sources: string): Task


export function concat(...args: any[]): Task {
  return create("file/concat", context => signature(args)
    .err((err) => context.fail(err))
    .map(["string", "array", "string"])
    .map(["string", "array"], (target, sources) => [target, sources, ""])
    .run((target: string, sources: Array<string>, seperator:string) => {
      try {
        system_concat(target, sources, seperator, data => context.log(data))
        context.ok()
      } catch(error) {
        context.fail(error)
      }
    }))
}