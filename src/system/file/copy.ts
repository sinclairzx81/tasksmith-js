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

import {Entry, scan_entry} from "../folder/scan"
import * as fs             from "fs"
import * as path           from "path"

/**
 * (synchronous) copies the file from the source path to the target file. If the
 * target file already exists, it will be overwritten with contents of the source,
 * otherwise the target file will be created.
 * @param {string} source the source file.
 * @param {string} target the target file.
 * @param {Function} log optional logging function.
 * @returns {void}
 */
export function copy(source: string, target: string, log:Function = function() {}) {
  let sourceEntry = scan_entry(path.resolve(source))
  let targetEntry = scan_entry(path.resolve(target))

  switch(sourceEntry.type) {
    case "null":
      throw Error(`unable to copy file ${sourceEntry.fullname} because it doesn't exist.`)
    case "directory":
      throw Error(`unable to copy file ${sourceEntry.fullname} because it is a directory.`)
    case "file":
      break
  }
  
  switch(targetEntry.type) {
    case "directory":
      throw Error(`unable to copy file ${sourceEntry.fullname} to ${targetEntry.fullname} because a directory exists at the target.`)
    case "file":
      fs.unlinkSync(targetEntry.fullname)
      break;
    case "null":
      break
  }
  
  log(`copying: ${sourceEntry.fullname} to ${targetEntry.fullname}`)

  let BUF_LENGTH = 64 * 1024
  let buff       = new Buffer(BUF_LENGTH)
  let fdr        = fs.openSync(sourceEntry.fullname, 'r')
  let fdw        = fs.openSync(targetEntry.fullname, 'w')
  let bytesRead  = 1
  let pos        = 0
  while (bytesRead > 0) {
    bytesRead = fs.readSync(fdr, buff, 0, BUF_LENGTH, pos)
    fs.writeSync(fdw,buff, 0, bytesRead)
    pos += bytesRead
  }
  fs.closeSync(fdr)
  fs.closeSync(fdw)
}

/**
 * (synchronous) copies the given source file into the target directory. If the file in the 
 * target directory already exists, then that file is overwritten.
 * @param {string} source the source file.
 * @param {string} directory the directory target.
 * @param {Function} log optional logging function.
 * @returns {void}
 */
export function copyTo(source: string, directory: string, log: Function = function() {}): void {
  let sourceEntry    = scan_entry(path.resolve(source))
  let directoryEntry = scan_entry(path.resolve(directory))
  let targetEntry    = scan_entry(path.resolve(path.join(directoryEntry.fullname, sourceEntry.basename)))

  switch(sourceEntry.type) {
    case "null":
      throw Error(`unable to copy file ${sourceEntry.fullname} because it doesn't exist.`)
    case "directory":
      throw Error(`unable to copy file ${sourceEntry.fullname} because it is a directory.`)
    case "file":
      break
  }
  
  switch(directoryEntry.type) {
    case "file":
      throw Error(`unable to copy file ${sourceEntry.fullname} into ${directoryEntry.fullname} because the directory is a file.`)
    case "null":
      throw Error(`unable to copy file ${sourceEntry.fullname} into ${directoryEntry.fullname} because the directory does not exist.`)
    case "directory":
      break;
  }

  switch(targetEntry.type) {
    case "directory":
       throw Error(`unable to copy file ${sourceEntry.fullname} as ${targetEntry.fullname} because a directory of the same name exists there.`)
    case "null":
      break;
    case "file":
      break;
  }

  copy(sourceEntry.fullname, targetEntry.fullname, log)
}