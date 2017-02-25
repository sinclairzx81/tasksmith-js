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
 * (synchronous) moves the given source file into the given target directory.
 * @param {string} source the path of the file to move.
 * @param {string} directory the directory to move this file to.
 * @param {Function} log optional logging function.
 * @return {void}
 */
export function move(target: string, directory: string, log: Function = function() {}): void {
  let targetEntry    = scan_entry(path.resolve(target))
  let directoryEntry = scan_entry(path.resolve(directory))
  let moveEntry      = scan_entry(path.resolve(path.join(directoryEntry.fullname, targetEntry.basename)))

  switch(targetEntry.type) {
    case "directory":
      throw Error(`unable to move file ${targetEntry.fullname} because it is a directory.`)
    case "null":
      throw Error(`unable to move file ${targetEntry.fullname} because it does not exist.`)
    case "file":
      break;
  }

  switch(directoryEntry.type) {
    case "null":
      throw Error(`unable to move file ${targetEntry.fullname} into ${directoryEntry.type} because it does not exist.`)
    case "file":
      throw Error(`unable to move file ${targetEntry.fullname} into ${directoryEntry.type} because it is a file.`)
    case "directory":
      break;
  }

  switch(moveEntry.type) {
    case "directory":
      throw Error(`unable to move file ${targetEntry.fullname} into ${directoryEntry.type} because a directory of this name already exists in the target directory.`)
    case "file":
      throw Error(`unable to move file ${targetEntry.fullname} into ${directoryEntry.type} because a file of this name already exists in the target directory.`)
    case "null":
      break;
  }

  log(`moving: ${targetEntry.fullname} to ${moveEntry.fullname}`)
  fs.renameSync(targetEntry.fullname, moveEntry.fullname)
}