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

import { signature } from "../common/signature"
import { Task }      from "./task"
import { create }    from "./create"

import * as fs from "fs"


/**
 * Debounce: A simple event debouncer.
 */
class Debounce {
  private handle: NodeJS.Timer
  /**
   * creates a new debounce with the given minimal delay.
   * @param {number} delay the minimal delay.
   * @returns {Debounce}
   */
  constructor(private delay: number) {
    this.handle = undefined
  }

  /**
   * runs the given function. If the function
   * is called before this debouncers delay
   * has elapsed, the event is rerun.
   * @param {Function} the function to run.
   * @returns {void}
   */
  public run(func: Function): void {
    if (this.handle !== undefined) {
      clearTimeout(this.handle)
    }
    this.handle = setTimeout(() => {
      func(); this.handle = undefined;
    }, this.delay)
  }
}

/**
 * creates a endlessly repeating task that iterates on file/directory watch events.
 * @param {number} target the path to the file or directory to watch.
 * @param {Task} func a task to repeat.
 * @returns {Task}
 */
export function watch(target: string, func: () => Task): Task

export function watch(...args: any[]): Task {
  return create("node/watch", context => signature(args)
    .err((err) => context.fail(err))
    .map(["string", "function"])
    .run((filepath: string, func: () => Task) => {

    //----------------------------------------
    // setup watcher loop
    //----------------------------------------
    let debounce = new Debounce(150)
    let watcher : fs.FSWatcher = undefined
    let task    : Task         = undefined
    let cancelled              = false
    let level                  = 0

    const step = () => {
      if (cancelled) return 
      // context.log("---------------------")
      // context.log("watch event")
      // context.log("---------------------")
      level += 1
      if (task !== undefined) {
        task.cancel()
      }
      // context.log("---------------------")
      // context.log("restarting")
      // context.log("---------------------")
      task = func()
      task.run(data => context.log(data))
        .then(() => level -= 1)
        .catch(error => {
          level -= 1
          //---------------------------------------
          // note: the watcher has a termination
          // condition where a task runs to 
          // completion in a failed state without
          // cancellation. This is tracked by the
          // level.
          //---------------------------------------
          if (level === 0) {
            context.fail(error)
            watcher.close()
          }
        })
    }
    // watch
    try {
      watcher = fs.watch(filepath, { recursive: true },
        (event, filename) => debounce.run(() => step())
      ); step()
    } catch(e) {
      context.log(e.message)
      context.fail(e.message)
    }
    
    // abort
    context.abort(() => {
      cancelled = true
      if (task !== undefined)
        task.cancel()
      if (watcher !== undefined) {
        watcher.close()
      }
      context.fail("aborted")
    })
  }))
}