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

import * as path from "path"
import * as fs from "fs"
import { Entry, scan_entry, scan_entries_recurisve } from "./scan"

/**
 * Returns the directory delete stack used by the drop() function.
 * @param {string} directory the directory to build the drop stack.
 * @returns {Array<string>} a stack of files and directories to delete.
 */
export function drop_stack(directory: string): Array<Entry> {
  let rootEntry = scan_entry(path.resolve(directory))
  let stack = scan_entries_recurisve(rootEntry.fullname)
  stack.unshift(rootEntry)
  return stack
}

/**
 * (synchronous) deletes the given target directory and all its contents. If the 
 * target directory does not exist, no action. If the target refers to a file, 
 * throw error. Otherwise delete.
 * @param {string} target the target directory to delete.
 * @param {Function} log optional logging function.
 * @returns {void}
 */
export function drop(target: string, log: Function = function () { }) {
  let rootEntry = scan_entry(path.resolve(target))
  switch (rootEntry.type) {
    case "null":
      return
    case "file":
      throw Error(`cannot drop directory ${rootEntry.fullname} because its a file.`)
    case "directory":
      let stack = drop_stack(rootEntry.fullname)
      while (stack.length > 0) {
        let dropEntry = stack.pop()
        switch (dropEntry.type) {
          case "null": break;
          case "directory":
            log(`dropping: ${dropEntry.fullname}`);
            fs.rmdirSync(dropEntry.fullname);
            break;
          case "file":
            log(`dropping: ${dropEntry.fullname}`);
            fs.unlinkSync(dropEntry.fullname);
            break;
        }
      }
  }
}