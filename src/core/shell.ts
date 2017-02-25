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

import { Process }   from "../system/shell/process"
import { signature } from "../common/signature"
import { Task }      from "./task"
import { create }    from "./create"

/**
 * runs the given shell command with the given expected exitcode.
 * @param {string} command the shell command to run.
 * @param {number} exitcode the expected exitcode.
 * @returns {Task}
 */
export function shell(command: string, exitcode: number): Task;

/**
 * runs the given shell command with an expected exitcode of 0.
 * @param {string} command the shell command to run.
 * @returns {Task}
 */
export function shell(command: string): Task;

export function shell(...args: any[]): Task {
  return create("core/shell", context => signature(args)
    .err((err) => context.fail(err))
    .map(["string", "number"])
    .map(["string"], (command) => [command, 0])
    .run((command: string, exitcode: number) => {

      let _process: Process;
      try {
        _process = new Process(command)
        _process.on("data", data => context.log(data))
        _process.on("end", code => {
          if (code !== exitcode) {
            context.fail(`unexpected exitcode. expected ${exitcode} got ${code}`)
          } else {
            context.ok()
          }
        })
      } catch (error) {
        context.fail(error)
      }

      context.abort(() => {
        if (_process !== undefined) {
          _process.dispose()
        } context.fail("abort")
      })
    }))
}