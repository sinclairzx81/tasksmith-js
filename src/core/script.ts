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

import {Promise}                from "../common/promise"
import {signature}              from "../common/signature"
import {ITask, Task, TaskEvent} from "./task"

/** 
 * specialized string formatter for variable length argument 
 * calls on the script contexts .log(), .ok() and .fail()
 * methods.
 * @param {any[]} arguments.
 * @returns {string}
 * @example
 * 
 * assert(format ("hello", "world"), "hello world") 
 * assert(format ("hello", null),    "hello")
 * assert(format (null, "world"),    "world")
 * assert(format (null, null),       "")
 * assert(format (),                 "")
 */
function format (args: any[]) : string  {
  if(args === null || args === undefined) return ""
  if(Array.isArray(args)   === false)     return ""
  let buffer = []
  for(let i = 0; i < args.length; i++) {
    if(args[i] === null || args[i] === undefined) continue;
    let str = args[i].toString()
    if(str.length === 0) continue;
    buffer.push(str)
  }
  return (buffer.length === 1) 
    ? buffer[0]
    : buffer.join(' ') 
}

/**
 * A script context given to callers to resolve a task.
 */
export interface IScriptContext {
  
  /**
   * emits a information message for this task.
   * @param {...args: any[]} optional string message to emit.
   * @returns {void}
   */
  log(...args: any[]) : void
  
  /**
   * completes this task with a optional message.
   * @param {string?} optional string message to emit.
   * @returns {void}
   */
  ok  (...args: any[]) : void
  
  /**
   * fails this task with a optional message.
   * @param {string?} optional string message to emit.
   * @returns {void}
   */
  fail(...args: any[]) : void

  /**
   * runs this task and logs its events.
   * @param {ITask} the task to run.
   * @returns {Promise<string>} A promise indicating ok or fail.
   */
  run (task: ITask) : Promise<string>
}

/**
 * creates a new script task.
 * @param {Function} a function to receive a script context when this task is run.
 * @returns {ITask}
 */
export function script (func: (context: IScriptContext) => void) : ITask

/**
 * creates a new script task.
 * @param {string} the name of this script task. defaults to "core/script" if not specified.
 * @param {Function} a function to receive a script context when this task is run.
 * @returns {ITask}
 */
export function script (name: string, func: (context: IScriptContext) => void) : ITask

/**
 * creates a new script task.
 * @param {any[]} arguments.
 * @returns {ITask}
 * @example
 * 
 * let mytask = task.script("work/mytask", context => {
 *    context.log("running mytask")
 *    setTimeout(() => {
 *      context.ok("finished!")
 *    })
 * })
 */
export function script (...args: any[]) : ITask {
  let param = signature<{
     task:  string,
     func: (context: IScriptContext) => void
  }>(args, [
      { pattern: ["string", "function"], map : (args) => ({ task: args[0],       func: args[1] })  },
      { pattern: ["function"],           map : (args) => ({ task: "core/script", func: args[0] })  },
  ])
  return new Task(param.task, (id, emitter) => {
    param.func({
      log : (...args: any[]) => emitter({ id: id, task: param.task, time: new Date(), type: "log",  data: format(args) }),
      ok  : (...args: any[]) => emitter({ id: id, task: param.task, time: new Date(), type: "ok",   data: format(args) }),
      fail: (...args: any[]) => emitter({ id: id, task: param.task, time: new Date(), type: "fail", data: format(args) }),
      run : (task: ITask) => task.subscribe(event => emitter(event)).run()
    })
  })
}