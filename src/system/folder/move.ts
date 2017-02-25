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

import * as path      from "path"
import * as fs        from "fs"
import { scan_entry } from "./scan"

/**
 * (synchronous) moves the given source directory 'into' the the given target directory.
 * @param {string} source the path of the directory to move.
 * @param {string} target the path of the target directory to move the source directory into.
 * @param {Function} log optional logging function.
 * @returns {void}
 */
export function move(source: string, target: string, log: Function = function () { }) {
  let sourceEntry = scan_entry(path.resolve(source))
  let targetEntry = scan_entry(path.resolve(target))
  let outputEntry = scan_entry(path.join(targetEntry.dirname, targetEntry.basename, sourceEntry.basename))
  
  switch (sourceEntry.type) {
    case "null":
      throw Error(`unable to move directory ${sourceEntry.fullname} because it doesn't exist.`)
    case "file":
      throw Error(`unable to move directory ${sourceEntry.fullname} because it is a file.`)
    case "directory":
      break;
  }

  switch (targetEntry.type) {
    case "file":
      throw Error(`unable to move directory from ${sourceEntry.fullname} to ${targetEntry.fullname} because the target directory points to a file.`)
    case "null":
      throw Error(`unable to move directory from ${sourceEntry.fullname} to ${targetEntry.fullname} because the target directory doesn't exist.`)
    case "directory":
      break;
  }

  switch (outputEntry.type) {
    case "file":
      throw Error(`unable to move directory from ${sourceEntry.fullname} to ${targetEntry.fullname} because it would conflict with an existing file in the target directory.`)
    case "directory":
      throw Error(`unable to move directory from ${sourceEntry.fullname} to ${targetEntry.fullname} because it would conflict with an existing directory in the target directory.`)
    case "null":
      break;
  }

  let oldPath = path.join(sourceEntry.dirname, sourceEntry.basename)
  let newPath = path.join(targetEntry.dirname, targetEntry.basename, sourceEntry.basename)
  log(`moving: ${oldPath} to ${newPath}`)
  fs.renameSync(oldPath, newPath)
}