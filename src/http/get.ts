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

import { get as system_get } from "../system/http/get"
import { signature }         from "../common/signature"
import { Task }              from "../core/task"
import { create }            from "../core/create"
import { noop }              from "../core/noop"

/**
 * creates a task that gets the http content from the remote endpoint.
 * @param {string} endpoint the http endpoint to get.
 * @param {Function} func the continuation task.
 * @returns {Task}
 */
export function get(endpoint: string, func: (content: string) => Task): Task

export function get(...args: any[]) : Task {
  return create("http/get", context => signature(args)
  .err((err) => context.fail(err))
  .map(["string", "function"])
  .run((endpoint: string, func: (content: string) => Task) => {

    let cancelled = false
    let task      = noop()
    system_get(endpoint).then(content => {
      if(cancelled) return
      task = func(content)
      task.run(data => context.log(data))
          .then(() => context.ok())
          .catch(error => context.fail(error))
    }).catch(error => context.log(error))

    context.abort(() => {
      cancelled = true
      task.cancel()
      context.fail("abort")
    })
  }))
}


// import {signature} from "../common/signature"
// import {Task}      from "../core/task"
// import {scope}     from "../core/scope"
// import * as util   from "../util/index"
// import * as path   from "path"

// /**
//  * creates a task that downloads a resource from the given uri.
//  * @param {string} uri the url to the resource.
//  * @param {string} filepath the filepath to save this resource as. 
//  * @returns {ITask}
//  */
// export function get(uri: string, filepath: string) : ITask

// /**
//  * creates a task that downloads a resource from the given uri.
//  * @param {any[]} arguments.
//  * @returns {ITask}
//  */
// export function get (...args: any[]) : ITask {
//   let param = signature<{
//     uri     : string
//     filepath: string
//   }>(args, [
//     { pattern: ["string", "string"], map : (args) => ({ uri: args[0], filepath: args[1] })  },
//   ])
//   return script("node/download", context => {
//     try {
//       let filepath = path.resolve(param.filepath)
//       context.log(`downloading ${param.uri} to ${filepath}`)
//       util.download(param.uri, filepath, message => context.log(message))
//           .then (()    => context.ok())
//           .catch(error => context.fail(error))
//     } catch (error) {
//       context.fail(error.message)
//     }
//   })
// }