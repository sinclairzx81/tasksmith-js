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
import * as common from "./common"
import * as path   from "path"
import * as fs     from "fs"

/**
 * creates a task that copies a file or directory to a target output directory.
 * @param {string} a message to log.
 * @param {string} the source path of the file or directory to copy.
 * @param {string} the target directory path.
 * @returns {ITask}
 */
export function copy(message: string, src: string, directory: string) : ITask

/**
 * creates a task that copies a file or directory to a target output directory.
 * @param {string} the source path of the file or directory to copy.
 * @param {string} the target directory path.
 * @returns {ITask}
 */
export function copy(src: string, directory: string) : ITask

/**
 * creates a task that copies a file or directory to a target output directory.
 * @param {any[]} arguments.
 * @returns {ITask}
 */
export function copy(...args: any[]) : ITask {
  let param = signature<{
    message    : string,
    src        : string,
    directory  : string
  }>(args, [
      { pattern: ["string", "string", "string"], map : (args) => ({ message: args[0], src: args[1], directory: args[2]  })  },
      { pattern: ["string", "string"],           map : (args) => ({ message: null,    src: args[0], directory: args[1]  })  },
  ])

  return script("node/fs/copy", context => {
    if(param.message !== null) context.log(param.message)
    try {
      let src = common.fs_resolve_path(param.src)
      let dst = common.fs_resolve_path(param.directory)
      let dst_info = common.fs_info(dst)
      let gather   = common.fs_tree(src)
      gather.forEach(src_info => {
        switch(src_info.type) {
          case "invalid"   : throw common.fs_error("copy", "invalid file or directory src path.", src)
          case "empty"     : throw common.fs_error("copy", "no file or directory exists at the given src.", src)
          case "directory":
            let directory = path.join(dst_info.dirname, 
                                          dst_info.basename,
                                     	    src_info.relname)
            context.log(common.fs_message("mkdir", [directory]))
            common.fs_build_directory(directory)
            break;
          case "file":
            let source = path.join(src_info.dirname, src_info.basename)
            let target = path.join(dst_info.dirname, dst_info.basename,
                                   src_info.relname, src_info.basename)
            context.log(common.fs_message("copy", [source, target]))
            common.fs_copy_file(source, target)
            break;
        }
      }); context.ok()
    } catch(error) {
      context.fail(error.message)
    }
  })
}