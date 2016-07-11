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

/// <reference path="./node.d.ts" />

import {signature} from "../common/signature"
import {ITask}     from "../core/task"
import {script}    from "../core/script"
import * as util   from "./util"
import * as path   from "path"
import * as fs     from "fs"

/**
 * creates a task that recursively copies a file or directory into a target directory.
 * @param {string} the source path of the file or directory to copy.
 * @param {string} the target directory path.
 * @returns {ITask}
 */
export function copy(source: string, target: string) : ITask

/**
 * creates a task that recursively copies a file or directory into a target directory.
 * @param {any[]} arguments.
 * @returns {ITask}
 */
export function copy(...args: any[]) : ITask {
  let param = signature<{
    source: string,
    target: string
  }>(args, [
    { pattern: ["string", "string"], map: (args) => ({ source: args[0], target: args[1]  })  },
  ])
  return script("node/copy", context => {
    try {
      let source = path.resolve(param.source)
      let target = path.resolve(param.target)
      util.copy(source, target, message => context.log(message))
      context.ok()
    } catch(error) {
      context.fail(error.message)
    }
  })
}