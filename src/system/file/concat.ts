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
import {read}              from "./read"
import * as path           from "path"
import * as fs             from "fs"

/**
 * (synchronous) concatinates the given sources into the given target. if the target does not 
 * exist, the target is created. If the target does exist, the target is overwritten.
 * @param {string} target the target file.
 * @param {string} sources the source files to concatinate.
 * @param {string} seperator a file join seperator.
 * @param {Function} log optional logging function.
 * @return {void}
 */
export function concat(target: string, sources: Array<string>, seperator: string = "", log: Function = function() {}): void {
  let targetEntry   = scan_entry(path.resolve(target))
  let sourceEntries = sources.map(source => scan_entry(path.resolve(source)))

  switch(targetEntry.type) {
    case "directory":
      throw Error(`cannot concat because the target ${targetEntry.fullname} is a directory.`)
    case "file":
      break;
    case "null":
      break;
  }

  sourceEntries.forEach(sourceEntry => {
    switch(sourceEntry.type) {
      case "directory":
        throw Error(`cannot concat because the source ${targetEntry.fullname} is a directory.`)
      case "null":
        throw Error(`cannot concat because the source ${targetEntry.fullname} does not exist.`)
      case "file":
        break;
    }
  })

  let content = sourceEntries.map(sourceEntry => 
    read(sourceEntry.fullname, "utf8", log))
      .join(seperator);
  
  log(`writing: ${targetEntry.fullname}`)

  fs.writeFile(targetEntry.fullname, content, {encoding: "utf8"})
}