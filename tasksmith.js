/*--------------------------------------------------------------------------

tasksmith.js - minimal task runner for node.

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

"use strict";

//--------------------------------------------------
// CORE types
//--------------------------------------------------

/**
 * Task:
 * Given to script tasks to complete operations.
 */
class Task {

  /**
   * creates a new task.
   * @param {Observer} observer passed in on the stream.
   * @returns {Task}
   */
  constructor(observer) {
    this.observer = observer
  }

  /**
   * emits some data out of this task.
   * @param {message} the message to echo.
   * @returns {void}
   */
  next(data) {
    this.observer.next(data)
  }

  /**
   * fails this 
   * @param {Error|any} the error to fail on.
   * @returns {void}
   */
  error(error) {
    this.observer.error(error)
  }

  /**
   * signals this task has completed. same as end.
   * @param {message} the message to echo.
   * @returns {void}
   */
  end() {
    this.observer.end()
  }

  /**
   * echos this message out.
   * @param {string} the message to echo.
   * @returns {void}
   */
  echo(message) {
    this.observer.next([message, '\n'].join(''))
  }

  /**
   * fails this task, same as error()
   * @param {Error|any} the error to fail on.
   * @returns {void}
   */
  fail(error) {
    this.observer.error(error)
  }

  /**
   * completes this task. same as end().
   * @returns {void}
   */
  done() {
    this.observer.end()
  }
}

/**
 * Stream:
 * Encapulates a unit of work.
 */
class Stream {

  /**
   * constructor: creates a new stream.
   * @param {Function} function to receive an observer.
   * @return {Stream<any>}
   */
  constructor(resolver) {
    const events = require("events")
    this.events   = new events.EventEmitter()
    this.resolver = resolver
    this.err      = false
    this.end      = false
  }

  /**
   * subscribes to an event on this stream.
   * @param {string} the name of the event.
   * @param {Function} the callback to receive the event.
   * @return {Stream<any>}
   */
  on(event, func) {
    this.events.on(event, func)
    return this
  }

  /**
   * maps the output of this stream to another type.
   * @param {Function} the map function.
   * @returns {Stream<any>}
   */
  map(func) {
    return new Stream(observer => {
      this.on("data",  data  => observer.next(func(data)))
          .on("error", error => observer.next(error))
          .on("end",   ()    => observer.end())
          .run()
    })
  }

  /**
   * converts stream to a promise, buffers output.
   * @return {Promise<any[]>}
   */
  collect() {
    return new Promise((resolve, reject) => {
      let buf = []
      this.on("data",  (data)  => { if(buffer_output) buf.push(data) })
          .on("error", (error) => reject(error))
          .on("end",   ()      => resolve(buf))
          .run()
    })
  }
  
  /**
   * converts stream to a promise. discards output.
   * @param {Function} optional function to receive any data.
   * @return {Promise<any>}
   */
  complete(func) {
    return new Promise((resolve, reject) => {
      this.on("data",  (data)  => { if(func) func(data) })
          .on("error", (error) => reject(error))
          .on("end",   ()      => resolve(buf))
          .run()
    })
  }
  
  /**
   * pipes the output from this stream to the given writable stream.
   * @param {Writeable} the writestream to pipe to.
   * @returns {void}
   */
  pipe(writestream) {
    this.on("data",  (data)  => writestream.write(data))
        .on("error", (error) => writestream.write(data.toString()))
        .on("end",   ()      => writestream.end())
        .run()
  }

  /**
   * starts this stream.
   * @returns {void}
   */
  run() {
    this.resolver(new Task({
      next: (value) => {
        if(!this.err && !this.end) 
          this.events.emit("data", value)
      },
      error: (error) => {
        if(!this.err && !this.end) 
          this.events.emit("error", error)
        this.err = true
      },
      end : () => {
        if(!this.end) 
          this.events.emit("end")
        this.end = true
      }
    }))
  }
}

//--------------------------------------------------
// CORE operations
//--------------------------------------------------

/**
 * creates a script function with a observer passed in.
 * @param {Observer} the observer function.
 * @return {Stream<any>}
 */
const script = resolver => new Stream(resolver)

/**
 * executes each stream in series (one after the other).
 * @param {Array<Stream>} the input streams.
 * @return {Stream<any>}
 */
const series = streams => new Stream(task => {
  const step = () => {
    if (streams.length === 0) {
      task.end()
    } else {
      streams.shift()
             .on("data", data => task.next(data))
             .on("end", () => step())
             .on("error", error => {
               task.error(error)
               task.end()
              }).run()
    }
  }; step()
})

/**
 * executes each stream in parallel.
 * @param {Array<Stream>} the input streams.
 * @returns {Stream}
 */
const parallel = streams => {
  return new Stream(task => {
    let acc = 0
    streams.forEach(stream => {
      stream.on("data",  data  => task.next(data))
            .on("end",   ()    => (acc === streams.length - 1) ? task.end() : acc ++)
            .on("error", error => {
              task.error(error)
              task.end()
            }).run()
    })
  })
}

/**
 * executes a shell command.
 * @param {string} the shell input line.
 * @return {Stream<any>}
 */
const shell = input => new Stream(task => {
  const spawn    = require('child_process').spawn
  const windows  = /^win/.test(process.platform)
  let proc = spawn(windows ? 'cmd' : 'sh', [windows ? '/c':'-c', input])
  proc.stdout.setEncoding("utf8")
  proc.stdout.on("data",  data  => task.next(data))
  proc.stdout.on("error", error => task.error(data))
  proc.on("error", error => task.error(data))
  proc.on("close",  (code) => setTimeout(() => {
    if(code !== 0) task.error(Error("err: " + code.toString()))
    task.end()
  }, 10))
})

/**
 * creates a minimal cli for running tasks.
 * @param {string} the shell input line.
 * @return {Stream<any>}
 */
const cli = (argv, tasks) => {
  let args = process.argv.reduce((acc, c, index) => {
    if(index > 1) acc.push(c)
    return acc
  }, [])
  if(args.length !== 1 || tasks[args[0]] === undefined) {
    return new Stream(task => {
      task.echo("[tasksmith]")
      task.echo("tasks:")
      Object.keys(tasks).forEach(key => task.echo([" - ", key].join('')))
    })
  } else {
    return new Stream(task => {
      tasks[args[0]]
        .on("data",   data  => task.next(data))
        .on("error",  error => task.error(error))
        .on("end",    data  => task.end())
        .run()
    })
  }
}

//--------------------------------------------------
// IO operations
//--------------------------------------------------

/**
 * echos a message to the output stream.
 * @param {string} the message to write.
 * @return {Stream<string>}
 */
const echo = (message) => new Stream(task => {
  task.echo(message)
  task.done()
})

/**
 * replicates the src file or folder to the destination.
 * @param {string} the src file or directory.
 * @param {string} the src file or directory.
 * @return {Stream<string>}
 */
const copy = (src, dst) => new Stream(task => {
  const fs   = require('fs')
  const path = require('path')

  let type = (path) => {
    let exists = fs.existsSync(path)
    if(exists === false)    return "nothing"
    let stats = exists && fs.statSync(path)
    if(stats.isFile())      return "file"
    if(stats.isDirectory()) return "directory"
    return "nothing"
  }
  let mkdir = (path) => {
    let exists = fs.existsSync(path)
    if(exists === true) return
    fs.mkdirSync(path)
  }
  let link = (src, dst) => {
    let exists = fs.existsSync(src)
    if(exists === true)
    fs.linkSync(src, dst)
  }
  let unlink = (path) => {
    let exists = fs.existsSync(path)
    if(exists === true) fs.unlink()
  }
  let should_copy = (src, dst) => {
    let se = fs.existsSync(src)
    if(se === false) return false
    let de = fs.existsSync(dst)
    if(de === false) return true
    let s = fs.statSync(src)
    let d = fs.statSync(dst)
    return (s.mtime.getTime() > d.mtime.getTime()) 
  }
  let scan = (src, dst) => {
    switch(type(src)) {
      case "directory":
        mkdir(dst)
        let contents =
         fs.readdirSync(src)
           .forEach(file =>
              scan(path.join(src, file), 
                   path.join(dst, file)))
      case "file":
        if(should_copy(src, dst)) {
          task.echo([" * copying", src, dst].join(' '))
          unlink(dst)
          link(src, dst)
        }
      default: break;
    }
  }
  scan(src, dst)
  task.done()
})

/** tasksmith exports. */
module.exports = {
  // core
  script    : script,
  shell     : shell,  
  series    : series,  
  parallel  : parallel,
  
  // cli
  cli       : cli,

  // io
  echo      : echo,
  copy      : copy,
}