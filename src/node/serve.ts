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

/// <reference path="./typings/node/node.d.ts" />

import {signature}        from "../common/signature"
import {ITask}            from "../core/task"
import {script}           from "../core/script"
import {createServer}     from "./http/signals"


/**
 * creates a infinite task that serves a directory over http.
 * @param {string} a message to log.
 * @param {string} the directory to serve.
 * @param {number} the port to serve this application on.
 * @param {boolean} should the task watch for content changes and live reload. default is false.
 * @returns {ITask}
 */
export function serve(message: string, directory: string, port: number, watch: boolean) : ITask

/**
 * creates a infinite task that serves a directory over http.
 * @param {string} the directory to serve.
 * @param {number} the port to serve this application on.
 * @param {boolean} should the task watch for content changes and live reload. default is false.
 * @returns {ITask}
 */
export function serve(directory: string, port: number, watch: boolean) : ITask

/**
 * creates a infinite task that serves a directory over http.
 * @param {string} a message to log.
 * @param {string} the directory to serve.
 * @param {number} the port to serve this application on.
 * @returns {ITask}
 */
export function serve(message: string, directory: string, port: number) : ITask

/**
 * creates a infinite task that serves a directory over http.
 * @param {string} the directory to serve.
 * @param {number} the port to serve this application on.
 * @returns {ITask}
 */
export function serve(directory: string, port: number) : ITask

/**
 * creates a infinite task that serves a directory over http.
 * @param {any[]} arguments
 * @returns {ITask}
 */
export function serve(...args: any[]) : ITask {
  let param = signature<{
    message   : string,
    directory : string,
    port      : number,
    watch     : boolean
  }>(args, [
      { pattern: ["string", "string",  "number", "boolean"], map : (args) => ({ message: args[0], directory: args[1], port: args[2], watch: args[3]  })  },
      { pattern: ["string", "number",  "boolean"],           map : (args) => ({ message: null,    directory: args[0], port: args[1], watch: args[2]  })  },
      { pattern: ["string", "string",  "number"],            map : (args) => ({ message: args[0], directory: args[1], port: args[2], watch: false    })  },
      { pattern: ["string", "number"],                       map : (args) => ({ message: null,    directory: args[0], port: args[1], watch: false    })  }
  ])
  return script("node/serve", context => {
    if(param.message !== null) context.log(param.message)
    createServer(
      param.directory, 
      param.watch, 
      (args) => context.log(args)
    ).listen(param.port)
  })
}