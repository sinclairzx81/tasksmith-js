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
import * as fsutil from "./fsutil"
import * as path   from "path"
import * as fs     from "fs"

/**
 * creates a task that recursively deletes a file or directory.
 * @param {string} the path of the file or directory to delete.
 * @returns {ITask}
 */
export function drop(drop_file_or_directory: string) : ITask

/**
 * creates a task that recursively deletes a file or directory.
 * @param {any[]} arguments.
 * @returns {ITask}
 */
export function drop(...args: any[]) : ITask {
  let param = signature<{
    drop_file_or_directory: string,
  }>(args, [
    { pattern: ["string"], map : (args) => ({ drop_file_or_directory: args[0] })  },
  ])
  return script("node/drop", context => {
    try {
        let src      = path.resolve (param.drop_file_or_directory)
        let dst_info = fsutil.meta  (src)
        let gather   = fsutil.tree  (src)
        gather.reverse()
        gather.forEach(src_info => {
            switch(src_info.type) {
              case "empty":   break;
              case "invalid": break;
              case "directory":
                let directory = path.join(src_info.dirname, src_info.basename)
                context.log(fsutil.message("drop", [directory]))
                fs.rmdirSync(directory)
                break;
              case "file":
                let filename = path.join(src_info.dirname, src_info.basename)
                context.log(fsutil.message("drop", [filename]))
                fs.unlinkSync(filename)
            }
        })
        context.ok()
      } catch(error) { 
        context.fail(error.message)
      }
  })
}