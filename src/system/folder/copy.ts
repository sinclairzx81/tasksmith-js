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

import { copy as copyfile }                          from "../file/copy"
import { Entry, scan_entry, scan_entries_recurisve } from "./scan"

import * as path from "path"
import * as fs   from "fs"

export interface CopyOperation {
  fromEntry : Entry,
  toEntry   : Entry
}

/**
 * (synchronous) returns the copy list used by the copy() operation.
 * @param {string} source the source directory.
 * @param {string} target the target directory.
 * @returns {Array<CopyOperation>} the copy operation stack.
 */
export function copy_stack(source: string, target: string): Array<CopyOperation> {
  let sourceEntry = scan_entry(path.resolve(source))
  let targetEntry = scan_entry(path.resolve(target))
  return scan_entries_recurisve(sourceEntry.fullname).map(fromEntry => {
    let toEntry = scan_entry(path.join(
      targetEntry.fullname,
      fromEntry.fullname.replace(sourceEntry.fullname, "")
    ))
    return {
      fromEntry: fromEntry,
      toEntry  : toEntry
    }
  }).reverse()
}

/**
 * (synchronous) copies the contents from the source directory into the target directory. 
 * If the target directory contains any file from the source, that file will be overwritten
 * with the source file.
 * @param {string} source the source directory.
 * @param {string} target the target directory.
 * @param {Function} log optional log function.
 * @returns {void}
 */
export function copy(source: string, target: string, log: Function = function () { }) {
  let sourceEntry = scan_entry(path.resolve(source))
  let targetEntry = scan_entry(path.resolve(target))
  
  switch (sourceEntry.type) {
    case "null":
      throw Error(`unable to copy directory ${sourceEntry.fullname} because it doesn't exist.`)
    case "file":
      throw Error(`unable to copy directory ${sourceEntry.fullname} because it is a file.`)
    case "directory":
      break;
  }

  switch (targetEntry.type) {
    case "file":
      throw Error(`unable to copy from ${sourceEntry.fullname} into ${targetEntry.fullname} because the target directory points to a file.`)
    case "null":
      throw Error(`unable to copy from ${sourceEntry.fullname} into ${targetEntry.fullname} because the target directory doesn't exist.`)
    case "directory":
      break;
  }

  let stack = copy_stack(source, target)
  while (stack.length > 0) {
    let operation = stack.pop()
    switch (operation.fromEntry.type) {
      
      //---------------------------------------------------------
      // source: null
      //---------------------------------------------------------
      case "null":
        log(`unable to copy ${operation.fromEntry.fullname} because it doesn't exist.`)
        break
      case "directory":
        switch (operation.toEntry.type) {
          case "file":
            log(`unable to copy directory ${operation.fromEntry.fullname} because the target ${operation.toEntry.fullname} directory contains a file of that name.`)
            break
          case "directory":
            log(`skipping: ${operation.toEntry.fullname}`)
            break
          case "null":
            log(`copying: ${operation.fromEntry.fullname} to ${operation.toEntry.fullname}`)
            fs.mkdirSync(operation.toEntry.fullname)
            break
        }
        break
      case "file":
        switch (operation.toEntry.type) {
          case "directory":
            log(`unable to copy file ${operation.fromEntry.fullname} because the target ${operation.toEntry.fullname} directory contains a directory of that name.`)
            break;
          case "file":
            copyfile(operation.fromEntry.fullname, operation.toEntry.fullname, log)
            break
          case "null":
            copyfile(operation.fromEntry.fullname, operation.toEntry.fullname, log)
            break;
        }
        break
    }
  }
}