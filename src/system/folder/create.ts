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

import * as path  from "path"
import * as fs    from "fs"
import {Entry, scan_entry} from "./scan"

/**
 * Returns the directory creation stack used for the create() method.
 * @param {string} target the target directory to create.
 * @returns {Array<Entry>} a stack of directory entries to create.
 */
export function create_stack(target: string): Array<Entry> {
  let currentEntry  = scan_entry(path.resolve(target))
  let stack         = []
  while(true) {
    switch(currentEntry.type) {
      case "directory":
        return stack
      case "file":
        throw Error(`found unexpected file ${currentEntry.fullname} while building directory creation stack.`)
      case "null":
        stack.push(currentEntry)
        let parentEntry = scan_entry(currentEntry.dirname)
        if(parentEntry.fullname === currentEntry.fullname) 
          throw Error(`drive ${parentEntry.fullname} does not exist.`)
        currentEntry = parentEntry
        break
    }
  }
}

/**
 * (synchronous) creates the given target directory recursively. If the target directory already 
 * exists, no action. If the target directory points to a file, raise error, otherwise create.
 * @param {string} target the directory to create.
 * @param {Function} log optional log function.
 * @returns {void}
 */
export function create(target: string, log: Function = function() {}) {
  let outputEntry = scan_entry(path.resolve(target))
  switch(outputEntry.type) {
    case "directory":
      return
    case "file":
      throw Error(`cannot create directory ${outputEntry.fullname} because it would conflict with an existing file in this location.`)
    case "null":
      let stack = create_stack(target)
      while(stack.length > 0) {
        let directoryEntry = stack.pop()
        log(`creating: ${directoryEntry.fullname}`)
        fs.mkdirSync(directoryEntry.fullname)
      } break;  
  }
}