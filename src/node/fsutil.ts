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

import * as path from "path"
import * as fs   from "fs"

/**
 * constructs a fs error in a consistent format.
 * @param {string} a method context.
 * @param {string} a error message.
 * @param {string} the path causing the problem.
 * @returns {string}
 */
export const message = (context:string, args: string[]) => 
   " - " + [context, args.join(" ")].join(": ")

/**
 * constructs a fs error in a consistent format.
 * @param {string} a method context.
 * @param {string} a error message.
 * @param {string} the path causing the problem.
 * @returns {Error}
 */
export const error = (context:string, message:string, path:string) => 
   new Error([context, message, path].join(": "))

/**
 * interface representation for a file system entity.
 */
export interface Meta {
  type     : "invalid" | "empty" | "file" | "directory",
  basename : string,
  dirname  : string,
  relname  : string,
  stat     : fs.Stats
}

/**
 * returns extended path information for a file or directory.
 * used throughout the other fs based operations.
 * @param {string} the path.
 * @returns {FsInfo}
 */
export const meta = (src:string): Meta => {
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
 * @return {FsInfo[]}
 */
export const tree = (src:string): Meta[] => {
  const src_info = meta(src)
  switch(src_info.type) {
    case "invalid": throw error("util: tree", "src path is invalid.", src)
    case "empty":   throw error("util: tree", "src exist doesn't exist.", src)
    case "directory":  /* ok */ break 
    case "file":       /* ok */ break
  }
  let buffer = []
  let seek   = (src, rel) => {
    let info = meta(src)
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
 * @param {string} the directory path to build.
 * @return {void}
 */
export const build_directory = (directory:string): void => {
  const info = meta(directory)
  switch(info.type) {
    case "directory": /* do nothing*/ break;
    case "invalid"  : throw error("util: build-directory", "directory path is invalid", directory)
    case "file"     : throw error("util: build-directory", "directory path points to a file.", directory)
    case "empty"    :
      let parent    = path.dirname(directory)
      if(fs.existsSync(parent) === false) build_directory(parent)
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
export const copy_file = (src: string, dst :string): void => {
  const src_info = meta(src)
  const dst_info = meta(dst)
  switch(src_info.type) {
    case "empty":     throw error("util: copy-file", "src file path doesn't exist.",  src)
    case "invalid":   throw error("util: copy-file", "src file path is invalid.",     src) 
    case "directory": throw error("util: copy-file", "attempted to link a directory", src)
    case "file": /* ok */ break;
  }
  switch(dst_info.type) {
    case "directory": throw error("util: copy-file", "dst file path found directory named the same.", dst)
    case "invalid":   throw error("util: copy-file", "dst file path is invalid.", dst) 
    case "empty":
    case "file":
        build_directory(dst_info.dirname) 
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
