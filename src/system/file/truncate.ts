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
 * (synchronous) truncates the target file and writes the given content. if the target,
 * does not exist, this file is created.
 * @param {string} target the path of the file to truncate.
 * @param {string} content the content to write.
 * @param {Function} log optional logging function.
 */
export function truncate(target: string, content: string = "", log: Function = function() {}) {
  let targetEntry = scan_entry(path.resolve(target))
  switch(targetEntry.type) {
    case "directory":
      throw Error(`unable to truncate ${targetEntry.fullname} because it is a directory.`)
    case "file":
      log(`truncating: ${targetEntry.fullname}`)
      fs.writeFile(targetEntry.fullname, content, {encoding: "utf8"})
      break;
    case "null":
      log(`writing: ${targetEntry.fullname}`)
      fs.writeFile(targetEntry.fullname, content, {encoding: "utf8"})
      break;
  }
}