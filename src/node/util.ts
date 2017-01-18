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

/// <reference path="./node.d.ts" />

//------------------------------------------------------
// util: 
// backend operations for copying, creating, and deleting
// files. support for copy, drop, append and concat.
//------------------------------------------------------

import * as path from "path"
import * as fs   from "fs"

/**
 * constructs a error type in a consistent format.
 * @param {string} a method context.
 * @param {string} a error message.
 * @param {string} the path associated with this error.
 * @returns {Error}
 */
export function error (context: string, message: string, path: string) {
  return new Error([context, message, path].join(": "))
} 

/**
 * interface representation for a file system entity.
 * this type is derived by a call to meta() on a file
 * system path.
 */
export interface StatExtended {
  type     : "invalid" | "not-found" | "file" | "directory",
  basename : string,
  dirname  : string,
  relname  : string,
  stat     : fs.Stats
}

/**
 * returns a file or directory stat with extended file or directory information.
 * @param {string} the file or directory path.
 * @returns {StatExtended}
 */
export const meta = (src: string): StatExtended => {
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
      type     : "not-found", 
      basename : path.basename(src),
      dirname  : path.dirname(src),
      relname  : path.normalize('./'),
      stat     : null
    }
  }
}

/**
 * returns a linear list of files and directories found under the
 * given path. If a path is a file, only 1 item is returned, if a 
 * directory, all items found under that directory are returned.
 * results are ordered from the top most directory down.
 * @param {string} the path to begin gathering.
 * @return {StatExtended[]}
 */
export function tree (src:string): StatExtended[] {
  const src_info = meta(src)
  switch(src_info.type) {
    case "invalid"   : throw error("util: tree", "src path is invalid.", src)
    case "not-found" : throw error("util: tree", "src exist doesn't exist.", src)
    case "directory" : /* ok */ break 
    case "file"      : /* ok */ break
  }
  let buffer = []
  let seek   = (src, rel) => {
    let info = meta(src)
    switch(info.type) {
      case "invalid"   : /* ignore */ break;
      case "not-found" : /* ignore */ break;
      case "file"      :
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
 * recursively builds a directory tree for the given directory path.
 * if a directory already exists, no action is taken, otherwise create.
 * @param {string} the directory path to build.
 * @param {(message:string) => void} optional logging function.
 * @returns {void}
 */
export function build_directory (directory: string, log?: (message: string) => void): void {
  log = log || function(message) {}
  const info = meta(directory)
  switch(info.type) {
    case "directory" : /* do nothing*/ break;
    case "invalid"   : throw error("build-directory", "directory path is invalid",        directory)
    case "file"      : throw error("build-directory", "directory path points to a file.", directory)
    case "not-found" :
      let parent = path.dirname(directory)
      if(fs.existsSync(parent) === false) build_directory(parent, log)
      let target = path.join(info.dirname, info.basename)
      log(["mkdir", target].join(" "))
      fs.mkdirSync(target)
      break
  }
}

/**
 * copies a single file to the given destination. if the directory
 * of the destination path does not exist, the directory will be
 * created.
 * @param {string} the source filename
 * @param {string} the destination filename.
 * @param {(message:string) => void} optional logging function.
 * @returns {void}
 */
export function copy_file (src: string, dst : string, log?: (message: string) => void): void {
  log = log || function(message) {}
  const meta_src = meta(src)
  const meta_dst = meta(dst)

  //-----------------------------------------
  // validate the source file.
  //-----------------------------------------  
  switch(meta_src.type) {
    case "invalid"  : throw error("copy-file", "src file path is invalid.",     src) 
    case "not-found": throw error("copy-file", "src file path doesn't exist.",  src)
    case "directory": throw error("copy-file", "attempted to link a directory", src)
    case "file": /* ok */ break;
  }

  //-----------------------------------------
  // validate destination file.
  //-----------------------------------------
  switch(meta_dst.type) {
    case "directory": throw error("copy-file", "dst file path found directory named the same.", dst)
    case "invalid"  : throw error("copy-file", "dst file path is invalid.",                     dst) 
    case "not-found":
    case "file":
        //-------------------------------------------------------
        // ensure the directory exists.
        //-------------------------------------------------------
        build_directory(meta_dst.dirname, log) 
        let source = path.join(meta_src.dirname, meta_src.basename)
        let target = path.join(meta_dst.dirname, meta_dst.basename)
        
        //--------------------------------------------------------
        // if the source and destination are the same, do nothing.
        //--------------------------------------------------------
        if(source !== target) {
          //-----------------------------------------------
          // if the file already exists, we need to unlink
          // it and replace it wil the file being copied.
          //-----------------------------------------------
          if(meta_dst.type === "file") {
            log(["unlink", target].join(" "))
            fs.unlinkSync (target)
          }
          log(["copy", source, target].join(" "))
          fs.linkSync (source, target)
        }
      break;
  }
}

/**
 * copies the given file or directory to the given target directory.
 * @param {string} the file or directory path to copy.
 * @param {string} the directory to copy into.
 * @param {(message:string) => void} optional logging function. 
 * @returns {void}
 */
export function copy (src: string, directory: string, log: (message: string) => void): void {
  log = log || function(message) {}
  let meta_src = meta(src)
  let meta_dst = meta(directory)

  //-----------------------------------------
  // validate the source file or directory.
  //-----------------------------------------
  switch(meta_src.type) {
    case "invalid"   : throw error("copy", "the source file or directory path is invalid", src)
    case "not-found" : throw error("copy", "the source file or directory path not found.", src) 
  }

  //-----------------------------------------
  // validate the destination directory.
  //-----------------------------------------  
  switch(meta_dst.type) {
    case "invalid"  : throw error("copy", "the destination directory path is invalid",       directory)
    case "file"     : throw error("copy", "the destination directory path points to a file", directory)
    case "not-found": build_directory(directory, log); break;
    case "directory": /* ok */ break;
  }

  //-----------------------------------------
  // obtain manifest and copy
  //-----------------------------------------
  let manifest = tree(src)
  manifest.forEach(meta_src => {
    switch(meta_src.type) {
      case "invalid"   : throw error("copy", "invalid file or directory path.", src)
      case "not-found" : throw error("copy", "file or directory path not found.", src)
      case "directory" :
        let directory = path.join(meta_dst.dirname, meta_dst.basename, meta_src.relname)
        build_directory(directory, log)
        break;
      case "file":
        let source = path.join(meta_src.dirname, meta_src.basename)
        let target = path.join(meta_dst.dirname, meta_dst.basename, meta_src.relname, meta_src.basename)
        copy_file(source, target, log)
        break;
    }
  })
}

/**
 * deletes the given file or directory.
 * @param {string} the target file or directory to delete.
 * @param {(message:string) => void} optional logging function.
 * @returns {void}
 */
export function drop (target: string, log?: (message: string) => void) : void {
  log = log || function(message) {}
  let meta_dst = meta  (target)
  switch(meta_dst.type) {
    case "invalid"   : throw error("drop", "invalid file or directory path", target)
    case "not-found" : return;
    case "file"      : /* ok */ break;
    case "directory" : /* ok */ break;
  }

  //-----------------------------------------
  // obtain manifest, reverse it and delete.
  //-----------------------------------------
  let manifest = tree  (target)
  manifest.reverse()
  manifest.forEach(src_info => {
      switch(src_info.type) {
        case "not-found": break;
        case "invalid":   break;
        case "directory":
          let directory = path.join(src_info.dirname, src_info.basename)
          log(["rmdir", directory].join(" "))
          fs.rmdirSync(directory)
          break;
        case "file":
          let filename = path.join(src_info.dirname, src_info.basename)
          log(["unlink", filename].join(" "))
          fs.unlinkSync(filename)
      }
  })
}

/**
 * appends the given file with the given string content. If the 
 * file does not exist, the file will be created with this content.
 * @param {string} the path of the file to append.
 * @param {string} the content to append to this file.
 * @param {(message:string) => void} optional logging function.
 * @returns {void}
 */
export function append(target: string, content: string, log?: (message: string) => void) : void {
  log = log || function(message) {}
  let meta_dst = meta(target)
  switch(meta_dst.type) {
    case "invalid"  : throw error("append", "the given path is invalid", target)
    case "directory": throw error("append", "the given path points to a directory", target)
    case "not-found": {
      //-------------------------------------------------------
      // ensure the directory exists.
      //-------------------------------------------------------
      build_directory(meta_dst.dirname, log)
      //-------------------------------------------------------
      // create the file with the given content.
      //-------------------------------------------------------    
      let filename = path.join(meta_dst.dirname, meta_dst.basename)
      log(["write", filename].join(" "))
      fs.writeFileSync(filename, content)
    } break;
    case "file": {
      //-------------------------------------------------------
      // append the content.
      //-------------------------------------------------------
      let filename = path.join(meta_dst.dirname, meta_dst.basename)
      log(["append", filename].join(" "))
      fs.appendFileSync(filename, content)  
    } break;   
  }
}

/**
 * concatinates the given sources into the target output file.
 * @param {string} the path of the target filename.
 * @param {string[]} an array of paths to files to concatinate.
 * @param {(message:string) => void} optional logging function.
 * @returns {void}
 */
export function concat (target: string, sources: string[], log?: (message: string) => void) : void {
  log = log || function(message) {}
  let meta_dst = meta(target) 
  switch(meta_dst.type) {
    case "invalid"   : throw error("concat", "the given path is invalid", target)
    case "directory" : throw error("concat", "the given path points to a directory", target)
    case "not-found" : /* ok */ break;
    case "file"      : /* ok */ break;   
  }
  //-------------------------------------------------------
  // ensure the directory exists.
  //-------------------------------------------------------
  build_directory(meta_dst.dirname, log)

  //-------------------------------------------------------
  // gather source contents and concatinate.
  //-------------------------------------------------------  
  let content = sources
                .map(filename => path.resolve(filename))
                .map(filename => fs.readFileSync(filename, "utf8"))
                .join("\n")
  
  //-------------------------------------------------------
  // write the file..
  //-------------------------------------------------------                  
  let filename = path.join(meta_dst.dirname, meta_dst.basename)
  log(["concat", filename].join(" "))
  fs.writeFileSync(filename, content)
}