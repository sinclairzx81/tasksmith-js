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
 * creates a task that recursively copies a file or directory into a target directory.
 * @param {string} the source path of the file or directory to copy.
 * @param {string} the target directory path.
 * @returns {ITask}
 */
export function copy(source_file_or_directory: string, target_directory: string) : ITask

/**
 * creates a task that recursively copies a file or directory into a target directory.
 * @param {any[]} arguments.
 * @returns {ITask}
 */
export function copy(...args: any[]) : ITask {
  let param = signature<{
    source_file_or_directory: string,
    target_directory        : string
  }>(args, [
    { pattern: ["string", "string"], map: (args) => ({ source_file_or_directory: args[0], target_directory: args[1]  })  },
  ])
  return script("node/copy", context => {
    try {
      let src = path.resolve(param.source_file_or_directory)
      let dst = path.resolve(param.target_directory)
      let dst_info = fsutil.meta  (dst)
      let gather   = fsutil.tree  (src)
      gather.forEach(src_info => {
        switch(src_info.type) {
          case "invalid"   : throw fsutil.error("copy", "invalid file or directory src path.", src)
          case "empty"     : throw fsutil.error("copy", "no file or directory exists at the given src.", src)
          case "directory":
            let directory = path.join(dst_info.dirname, 
                                          dst_info.basename,
                                     	    src_info.relname)
            context.log(fsutil.message("mkdir", [directory]))
            fsutil.build_directory(directory)
            break;
          case "file":
            let source = path.join(src_info.dirname, src_info.basename)
            let target = path.join(dst_info.dirname, dst_info.basename,
                                   src_info.relname, src_info.basename)
            context.log(fsutil.message("copy", [source, target]))
            fsutil.copy_file(source, target)
            break;
        }
      }); 
      context.ok()
    } catch(error) {
      context.fail(error.message)
    }
  })
}