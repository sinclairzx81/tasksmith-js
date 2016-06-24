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

import {signature} from  "../common/signature"
import {ITask}     from "../core/task"
import {script}    from "../core/script"
import {spawn}     from "child_process"

/**
 * creates a task that executes a shell command.
 * @param {string} a message to log.
 * @param {string} the shell command to execute.
 * @param {number} the expected exitcode.
 * @returns {ITask}
 */
export function shell(message: string, command: string, exitcode: number) : ITask;

/**
 * creates a task that executes a shell command.
 * @param {string} the shell command to execute.
 * @param {number} the expected exitcode.
 * @returns {ITask}
 */
export function shell(command: string, exitcode: number) : ITask;

/**
 * creates a task that executes a shell command.
 * @param {string} a message to log.
 * @param {string} the shell command to execute.
 * @param {number} the expected exitcode.
 * @returns {ITask}
 */
export function shell(message: string, command: string) : ITask;

/**
 * creates a task that executes a shell command.
 * @param {string} the shell command to execute.
 * @returns {ITask}
 */
export function shell(command: string) : ITask;

/**
 * creates a task that executes a shell command.
 * @param {any[]} arguments.
 * @returns {ITask}
 */
export function shell(...args: any[]) : ITask {
  let param = signature<{
    message   : string,
    command   : string,
    exitcode  : number
  }>(args, [
      { pattern: ["string", "string", "number"], map : (args) => ({ message: args[0], command: args[1], exitcode: args[2]  })  },
      { pattern: ["string", "number"],           map : (args) => ({ message: null,    command: args[0], exitcode: args[1]  })  },
      { pattern: ["string", "string"],           map : (args) => ({ message: args[0], command: args[1], exitcode: 0        })  },
      { pattern: ["string"],                     map : (args) => ({ message: null,    command: args[0], exitcode: 0        })  },
  ])  

  return script("node/shell", context => {
    if(param.message !== null) context.log(param.message)
    context.log(param.command)
    const windows = /^win/.test(process.platform)
    const proc    = spawn(windows ? 'cmd' : 'sh', [windows ? '/c':'-c', param.command])
    proc.stdout.setEncoding("utf8")
    proc.stdout.on("data",  data  => context.log ("stdout:", data))
    proc.stderr.on("data",  data  => context.log ("stderr:", data))
    proc.on("error",        error => context.fail(error.toString))
    proc.on("close",        code  => {
      // TODO: investigate better way of shutting down the shell.
      //       this implementation waits before closing due to the
      //       contents of the output stream not being entirely 
      //       available.
      setTimeout(() => {
        (param.exitcode !== code)
          ? context.fail("shell: unexpected exit code. expected" , param.exitcode, " got ", code)
          : context.ok()
      }, 100)
    })  
  })
}