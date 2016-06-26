/*--------------------------------------------------------------------------

tasksmith - task automation library for node.

The MIT License (MIT)

Copyright (c) 2015-2016 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

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

/// <reference path="./node.d.ts" />

import {ITask}  from "../core/task"
import {script} from "../core/script"

/**
 * returns a task that creates a simple cli to run tasks by name.
 * @param {Array<string>} process.argv or similar.
 * @param {{[taskname: string]: Task}} a dictionary / object containing named tasks.
 * @returns {ITask}
 */
export const cli = (argv: string[], tasks: {[taskname: string]: ITask}) => script("node/cli", context => {
  let args = process.argv.reduce((acc, c, index) => {
    if(index > 1) acc.push(c)
    return acc
  }, [])
  if(args.length !== 1 || tasks[args[0]] === undefined) {
    context.log("tasks:")
    Object.keys(tasks).forEach(key => context.log(" - ", key))
    context.ok()
  } else {
    let task = tasks[args[0]]
    context.log("running: [" + args[0] + "]")
    task.subscribe(event => context.log(event))
        .run()
        .then(_      => context.ok())
        .catch(error => context.fail(error))
  }
})