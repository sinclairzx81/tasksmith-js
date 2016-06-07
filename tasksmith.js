/*--------------------------------------------------------------------------

tasksmith.js - lightweight task runner for node.

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

/** the stream type */
class Stream {

  /**
   * constructor: creates a new stream.
   * @param {Function} function to receive an observer.
   * @return {Stream<any>}
   */
  constructor(func) {
    const events = require("events")
    this.func   = func
    this.events = new events.EventEmitter()
    this.err    = false
    this.end    = false
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
          .begin()
    })
  }

  /**
   * converts this stream into a promise.
   * @param {boolean?} buffer data events.
   * @return {Promise<any>}
   */
  promise(buffer_output) {
    return new Promise((resolve, reject) => {
      let buf = []
      this.on("data",  (data)  => { if(buffer_output) buf.push(data) })
          .on("error", (error) => reject(error))
          .on("end",   ()      => resolve(buf))
          .begin()
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
        .begin()
  }

  /**
   * begins resolving this stream.
   * @returns {void}
   */
  begin() {
    this.func({
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
    })
  }
}

/**
 * creates a script function with a observer passed in.
 * @param {Observer} the observer function.
 * @return {Stream<any>}
 */
const script = (observer) => new Stream(observer)

/**
 * executes each stream in series (one after the other).
 * @param {Array<Stream>} the input streams.
 * @return {Stream<any>}
 */
const series = (streams) => new Stream(observer => {
  const step = () => {
    if (streams.length === 0) {
      observer.end()
    } else {
      streams.shift()
             .on("data", data => observer.next(data))
             .on("end", () => step())
             .on("error", error => {
               observer.error(error)
               observer.end()
              }).begin()
    }
  }; step()
})

/**
 * executes each stream in parallel.
 * @param {Array<Stream>} the input streams.
 * @returns {Stream}
 */
const parallel = (streams) => {
  return new Stream(observer => {
    let acc = 0
    streams.forEach(stream => {
      stream.on("data",  data  => observer.next(data))
            .on("end",   ()    => (acc === streams.length-1) ? observer.end() : acc ++)
            .on("error", error => { 
              observer.error(error)
              observer.end() 
            }).begin()
    })
  })
}

/**
 * executes a shell command.
 * @param {string} the shell input line.
 * @return {Stream<any>}
 */
const shell = input => new Stream(observer => {
  const isWin  = /^win/.test(process.platform)
  const spawn  = require('child_process').spawn
  let proc     = spawn(isWin ? 'cmd' : 'sh', [isWin ? '/c':'-c', input])
  proc.stdout.setEncoding("utf8")
  proc.stdout.on("data",  data  => observer.next(data))
  proc.stdout.on("error", error => observer.error(data))
  proc.on("error", error => observer.error(data))
  proc.on("close",  (code) => setTimeout(() => {
    observer.end()
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
    return new Stream(observer => {
      observer.next("[tasksmith]\n")
      observer.next("run:\n")
      Object.keys(tasks)
        .forEach(task => 
          observer.next([" - ", task, "\n"].join('')))
    })
  } else {
    return new Stream(observer => {
      tasks[args[0]]
        .on("data",   data => observer.next(data))
        .on("error",  error => observer.next(error.toString()))
        .begin()
    })
  }
}

/** tasksmith exports. */
module.exports = {
  script    : script,
  shell     : shell,  
  series    : series,  
  parallel  : parallel,
  cli       : cli
}