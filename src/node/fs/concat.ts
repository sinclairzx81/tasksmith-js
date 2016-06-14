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

import {signature} from "../../common/signature"
import {ITask}     from "../../core/task"
import {script}    from "../../core/script"
import * as path   from "path"
import * as fs     from "fs"

/**
 * creates a task that concatinates a the given sources to a target output file.
 * @param {string} a message to log.
 * @param {string} the target file.
 * @param {string[]} the sources to concatinate.
 * @returns {ITask}
 */
export function concat(message: string, target: string, sources: string[]) : ITask

/**
 * creates a task that concatinates a the given sources to a target output file.
 * @param {string} the target file.
 * @param {string[]} the sources to concatinate.
 * @returns {ITask}
 */
export function concat(filename: string, target: string[]) : ITask

/**
 * creates a task that concatinates a the given sources to a target output file.
 * @param {any[]} arguments.
 * @returns {ITask}
 */
export function concat(...args: any[]) : ITask {
  let param = signature<{
    message  : string,
    target   : string,
    sources  : string[]
  }>(args, [
      { pattern: ["string", "string", "array"], map : (args) => ({ message: args[0], target: args[1], sources: args[2]  })  },
      { pattern: ["string", "array"],           map : (args) => ({ message: null,    target: args[0], sources: args[1]  })  },
  ])
  return script("node/fs/concat", context => {
    if(param.message !== null) context.log(param.message)
    try {
      let output = param.sources.map(file => fs.readFileSync(file, "utf8")).join("\n")
     fs.writeFileSync(param.target, output)
     context.ok()
    } catch(error) {
      context.fail(error.message)
    }
  })
}