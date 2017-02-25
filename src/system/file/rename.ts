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

import {scan_entry, Entry} from "../folder/scan"
import * as path           from "path"
import * as fs             from "fs"

/**
 * (synchronous) renames the given target file to the given new name.
 * @param {string} target the path of the file to rename.
 * @param {string} newname the new name of this file.
 * @param {Function} log optional logging function.
 * @returns {void}
 */
export function rename (target: string, newname: string, log: Function = function() {}) {
  if(newname.indexOf("/") !== -1 || newname.indexOf("\\") !== -1) {
    throw Error("file newname argument cannot be a path.")
  }
  
  let targetEntry = scan_entry(path.resolve(target))
  let renameEntry = scan_entry(path.resolve(path.join(targetEntry.dirname, newname)))

  switch(targetEntry.type) {
    case "directory":
      throw Error(`unable to rename file ${targetEntry.fullname} because it is a directory.`)
    case "null":
      throw Error(`unable to rename file ${targetEntry.fullname} because it doesn't exist.`)
    case "file":
      break;
  }

  switch(renameEntry.type) {
    case "directory":
      throw Error(`unable to rename file ${targetEntry.fullname} to ${renameEntry.fullname} because a directory already exists of this name.`)
    case "file":
      throw Error(`unable to rename file ${targetEntry.fullname} to ${renameEntry.fullname} because a file already exists of this name.`)
    case "null":
      break;
  }

  log(`renaming: ${targetEntry.fullname} to ${renameEntry.fullname}`)
  fs.renameSync(targetEntry.fullname, renameEntry.fullname)
}