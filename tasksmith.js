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
  constructor(observer) { this.observer = observer  }

  /**
   * emits some data out of this task.
   * @param {message} the message to echo.
   * @returns {void}
   */
  next(data) { this.observer.next(data) }

  /**
   * fails this 
   * @param {Error|any} the error to fail on.
   * @returns {void}
   */
  error(error) {  this.observer.error(error) }

  /**
   * signals this task has completed. same as end.
   * @param {message} the message to echo.
   * @returns {void}
   */
  end() { this.observer.end() }
  
  /**
   * echos this message out.
   * @param {string} the message to echo.
   * @returns {void}
   */
  echo(message) { this.observer.next([message, '\n'].join('')) }

  /**
   * fails this task. emitting the reason as a error ending.
   * @param {string} informative reason for the failure.
   * @returns {void}
   */
  fail(reason) {
    reason = reason || "unknown failure."
    this.observer.error(new Error(reason))
    this.observer.end()
  }

  /**
   * completes this task. same as end().
   * @returns {void}
   */
  done() { this.observer.end() }
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
  const next = () => {
    if (streams.length === 0) {
      task.end()
    } else {
      let error   = null
      let current = streams.shift()
      current.on("data", data => task.next(data))
      current.on("error", err => error = err) 
      current.on("end", () => {
        if(error == null) 
          next()
        else {
          task.error(error)
          task.end()
          streams = []
          next()
        }
      }).run()
    }
  }; next()
})

/**
 * executes each stream in parallel.
 * @param {Array<Stream>} the input streams.
 * @returns {Stream}
 */
const parallel = streams => {
  return new Stream(task => {
    let acc = 0
    streams.forEach(current => {
      current.on("data",  data  => task.next(data))
      current.on("end",   ()    => (acc === streams.length - 1) ? task.end() : acc ++)
      current.on("error", error => {
        task.error(error)
        task.end()
      }).run()
    })
  })
}

/**
 * echos a message to the output stream.
 * @param {string} the message to write.
 * @return {Stream<string>}
 */
const echo = (message) => new Stream(task => {
  task.echo(message)
  task.done()
})

//--------------------------------------------------
// SHELL operations
//--------------------------------------------------

/**
 * executes a shell command.
 * @param {string} the shell command.
 * @param {string} the expected exit code. if null, assumes 0.
 * @return {Stream<any>}
 */
const shell = (command, exitcode) => new Stream(task => {
  exitcode = exitcode || 0
  const spawn    = require('child_process').spawn
  const windows  = /^win/.test(process.platform)
  let proc = spawn(windows ? 'cmd' : 'sh', [windows ? '/c':'-c', command])
  proc.stdout.setEncoding("utf8")
  proc.stdout.on("data",  (data)  => task.next(data))
  proc.stdout.on("error", (error) => task.error(error))
  proc.on("error",  (error) => task.error(data))
  proc.on("close",  (code) => setTimeout(() => {
    if(exitcode !== code) 
      task.fail("shell: unexpected exit code. expected " + exitcode + " got " + code)
    else
      task.done()
  }, 10))
})

/**
 * creates a delay task with the given timeout in milliseconds.
 * @param {number} the timeout in milliseconds.
 * @return {Stream<any>}
 */
const delay = (ms) => new Stream(task => {
  setTimeout(() => task.done(), ms)
})


//--------------------------------------------------
// FS operations
//--------------------------------------------------
const fs   = require('fs')
const path = require('path')

/**
 * constructs a fs error in a consistent format.
 * @param {string} a method context.
 * @param {string} a error message.
 * @param {string} the path causing the problem.
 * @returns {string}
 */
const fs_message = (context, args) => 
   " - " + [context, args.join(" ")].join(": ")

/**
 * constructs a fs error in a consistent format.
 * @param {string} a method context.
 * @param {string} a error message.
 * @param {string} the path causing the problem.
 * @returns {Error}
 */
const fs_error = (context, message, path) => 
   new Error([context, message, path].join(": "))

/**
 * resolves the given path.
 * @param {string} the path to resolve.
 * @returns {string}
 */
const fs_resolve_path = (p) => path.resolve(p)

/**
 * returns extended path information for a file or directory.
 * used throughout the other fs based operations.
 * @param {string} the path.
 * @return {
 *  type     : string, 
 *  basename : string,
 *  dirname  : string,
 *  relname  : relname,
 *  stat     : IStat
 * }
 */
const fs_info = (src) => {
  let exists = fs.existsSync(src)
  let stat   = exists && fs.statSync(src)
  if(src === null || src === undefined) {
    return {
      type     : "invalid", 
      basename : path.basename(src),
      dirname  : path.dirname(src),
      relname  : path.normalize('./'),
      stat     : null,
    }
  } else if(exists === true) {
    if(stat.isDirectory()) return {
      type     : "directory", 
      basename : path.basename(src),
      dirname  : path.dirname(src),
      relname  : path.normalize('./'),
      stat     : stat
    }
    if(stat.isFile()) return {
      type      : "file", 
      basename  : path.basename(src),
      dirname   : path.dirname(src),
      relname   : path.normalize('./'),
      stat      : stat
    }
  } else {
    return {
      type     : "empty", 
      basename : path.basename(src),
      dirname  : path.dirname(src),
      relname  : path.normalize('./'),
      stat     : null
    }
  }
}

/**
 * returns a file or directory tree used for batch operations.
 * @param {string} the path to begin gathering.
 * @return {Array<{
 *  type     : string, 
 *  basename : string,
 *  dirname  : string,
 *  relname  : relname,
 *  stat     : IStat
 * }>}
 */
const fs_tree = (src) => {
  const src_info = fs_info(src)
  switch(src_info.type) {
    case "invalid": throw fs_error("fs_tree", "src path is invalid.", src)
    case "empty":   throw fs_error("fs_tree", "src exist doesn't exist.", src)
    case "directory":  /* ok */ break 
    case "file":       /* ok */ break
  }
  let buffer = []
  let seek = (src, rel) => {
    let info = fs_info(src)
    switch(info.type) {
      case "invalid": /* ignore */ break;
      case "empty":   /* ignore */ break;
      case "file":
        info.relname = rel
        buffer.push(info)
        break;
      case "directory":
        buffer.push(info)
        info.relname  = path.join(rel, info.basename)
        let dirname   = path.join(info.dirname, info.basename)
        fs.readdirSync(dirname).forEach(basename => 
          seek(path.join(dirname, basename), info.relname))        
        break
    }
  }
  seek(src, path.normalize("./")) 
  return buffer
}

/**
 * builds a directory tree recursively. if the tree exists already, do nothing.
 * @param {string} the src file or directory.
 * @return {Stream<string>}
 */
const fs_build_directory = (directory) => {
  const info = fs_info(directory)
  switch(info.type) {
    case "directory": /* do nothing*/ break;
    case "invalid"  : throw fs_error("fs_build_directory", "directory path is invalid", directory)
    case "file"     : throw fs_error("fs_build_directory", "directory path points to a file.", directory)
    case "empty"    :
      let parent    = path.dirname(directory)
      if(fs.existsSync(parent) === false) fs_build_directory(parent)
      fs.mkdirSync(path.join(info.dirname, info.basename))
      break
  }
}

/**
 * copies from the source file to the destination file.
 * @param {string} the source filename
 * @param {string} the destination filename.
 * @return {Stream<string>}
 */
const fs_copy_file = (src, dst) => {
  const src_info = fs_info(src)
  const dst_info = fs_info(dst)
  switch(src_info.type) {
    case "empty": throw fs_error("fs_copy_file", "src file path doesn't exist.", src)
    case "invalid": throw fs_error("fs_copy_file", "src file path is invalid.", src) 
    case "directory": throw fs_error("fs_copy_file", "attempted to link a directory", src)
    case "file": /* ok */ break;
  }
  switch(dst_info.type) {
    case "directory": throw fs_error("fs_copy_file", "dst file path found directory named the same.", dst)
    case "invalid":   throw fs_error("fs_copy_file", "dst file path is invalid.", dst) 
    case "empty":
    case "file":
        fs_build_directory(dst_info.dirname) 
        let source = path.join(src_info.dirname, src_info.basename)
        let target = path.join(dst_info.dirname, dst_info.basename)
        // if the source and destination are the same, do nothing.
        if(source !== target) {
          // unlink the target if exists.
          if(dst_info.type === "file") fs.unlinkSync (target) 
          fs.linkSync (source, target)
        }
      break;
  }
}

/**
 * copies a file or directory to a target directory.
 * @param {string} the file or directory being copied.
 * @param {string} the target directory the file or directory should be copied to.
 * @return {Stream<string>}
 */
const copy = (src, dst) => new Stream(task => {
  try {
    src = fs_resolve_path(src)
    dst = fs_resolve_path(dst)
    let dst_info = fs_info(dst)
    let gather   = fs_tree(src)
    gather.forEach(src_info => {
      switch(src_info.type) {
        case "invalid"   : throw fs_error("copy", "invalid file or directory src path.", src)
        case "empty"     : throw fs_error("copy", "no file or directory exists at the given src.", src)
        case "directory":
          let directory = path.join(dst_info.dirname, 
                                    dst_info.basename,
                                    src_info.relname)
          task.echo(fs_message("mkdir", [directory]))
          fs_build_directory(directory)
          break;
        case "file":
          let source = path.join(src_info.dirname, src_info.basename)
          let target = path.join(dst_info.dirname, dst_info.basename,
                                src_info.relname, src_info.basename)
          task.echo(fs_message("copy", [source, target]))
          fs_copy_file(source, target)
          break;
      }
    }); task.done()
  } catch(error) { 
    task.error(error)
    task.end()
  }
})

/**
 * deletes a file or directory. be careful.
 * @param {string} the file or directory to drop.
 * @return {Stream<string>}
 */
const drop = (src) => new Stream(task => {
 try {
    src = fs_resolve_path(src)
    let dst_info = fs_info(src)
    let gather   = fs_tree(src)
    gather.reverse()
    gather.forEach(src_info => {
        switch(src_info.type) {
          case "empty":   break;
          case "invalid": break;
          case "directory":
            let directory = path.join(src_info.dirname, src_info.basename)
            task.echo(fs_message("drop", [directory]))
            fs.rmdirSync(directory)
            break;
          case "file":
            let filename = path.join(src_info.dirname, src_info.basename)
             task.echo(fs_message("drop", [filename]))
            fs.unlinkSync(filename)
        }
    })
    task.done()
  } catch(error) { 
    task.error(error)
    task.end()
  }
})

//--------------------------------------------------
// CLI operations
//--------------------------------------------------

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
      task.echo("[tasksmith-cli]")
      task.echo("tasks:")
      Object.keys(tasks).forEach(key => task.echo([" - ", key].join('')))
    })
  } else {
    return new Stream(task => {
      task.echo("running: " + args[0])
      tasks[args[0]]
        .on("data",   data  => task.next(data))
        .on("error",  error => task.error(error))
        .on("end",    data  => task.end())
        .run()
    })
  }
}

/** tasksmith exports. */
module.exports = {
  script    : script,
  shell     : shell,  
  series    : series,  
  parallel  : parallel,
  echo      : echo,
  delay     : delay,
  copy      : copy,
  drop      : drop,
  cli       : cli
}