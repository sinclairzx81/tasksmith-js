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

/// <reference path="../../typings/node/node.d.ts" />

//--------------------------------------------------
// file system and path abstraction, this file
// is used by the other fs task operations.
//
// this file could use a refactoring.
//--------------------------------------------------

import * as path from "path"
import * as fs   from "fs"

/**
 * constructs a fs error in a consistent format.
 * @param {string} a method context.
 * @param {string} a error message.
 * @param {string} the path causing the problem.
 * @returns {string}
 */
export const fs_message = (context:string, args: string[]) => 
   " - " + [context, args.join(" ")].join(": ")

/**
 * constructs a fs error in a consistent format.
 * @param {string} a method context.
 * @param {string} a error message.
 * @param {string} the path causing the problem.
 * @returns {Error}
 */
export const fs_error = (context:string, message:string, path:string) => 
   new Error([context, message, path].join(": "))

/**
 * resolves the given path.
 * @param {string} the path to resolve.
 * @returns {string}
 */
export const fs_resolve_path = (p:string) => path.resolve(p)

/**
 * interface representation for a file system entity.
 */
export interface FsInfo {
  type    : "invalid" | "empty" | "file" | "directory",
  basename: string,
  dirname : string,
  relname : string,
  stat    : fs.Stats
}

/**
 * returns extended path information for a file or directory.
 * used throughout the other fs based operations.
 * @param {string} the path.
 * @returns {FsInfo}
 */
export const fs_info = (src:string): FsInfo => {
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
export const fs_tree = (src:string): FsInfo[] => {
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
 * @param {string} the directory path to build.
 * @return {void}
 */
export const fs_build_directory = (directory:string): void => {
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
export const fs_copy_file = (src:string, dst:string): void => {
  const src_info = fs_info(src)
  const dst_info = fs_info(dst)
  switch(src_info.type) {
    case "empty":     throw fs_error("fs_copy_file", "src file path doesn't exist.",  src)
    case "invalid":   throw fs_error("fs_copy_file", "src file path is invalid.",     src) 
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
