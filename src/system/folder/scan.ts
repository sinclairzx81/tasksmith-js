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

import * as path from "path"
import * as fs   from "fs"

/**
 * directory entry type.
 */
export interface DirectoryEntry {
  type     : "directory",
  /* the full absolute path of this directory. */
  fullname : string,
  /** the absolute parent path of this directory. */
  dirname  : string,
  /** the name of this directory. */
  basename : string
  /** the fsstat record for this directory */
  stats    : fs.Stats
}

/**
 * file entry type.
 */
export interface FileEntry {
  type     : "file",
  /* the full absolute path of this file. */
  fullname : string,
  /** the absolute parent path of this file. */
  dirname  : string,
  /** the name of this file. */
  basename : string
  /** the fsstat record for this file */
  stats    : fs.Stats
}

/**
 * null entry type.
 */
export interface NullEntry {
  type     : "null",
  /* the full absolute path of this entry. */
  fullname : string,
  /** the absolute parent path of this entry. */
  dirname  : string,
  /** the name of this entry. */
  basename : string
}

export type Entry = DirectoryEntry | FileEntry | NullEntry

/**
 * (synchronous) returns a file/directory entry for the given filepath.
 * @param {string} filepath the filepath to read.
 * @returns {Entry}
 */
export function scan_entry(filepath: string): Entry {
  let resolved = path.resolve(filepath)
  let dirname  = path.dirname(resolved)
  let basename = path.basename(resolved)
  try {
    let stats = fs.statSync(filepath)
    return (stats.isDirectory())
      ? {
        type     : "directory",
        fullname : path.join(dirname, basename),
        dirname  : dirname,
        basename : basename,
        stats    : stats
      } : {
        type     : "file",
        fullname : path.join(dirname, basename),
        dirname  : dirname,
        basename : basename,
        stats    : stats
      }
  } catch (e) {
    return {
      type     : "null",
      fullname : path.join(dirname, basename),
      dirname  : dirname,
      basename : basename
    }
  }
}

/**
 * (synchronous) scans a directory for its immediate contents.
 * @param {string} directory the directory to scan.
 * @returns {Array<Entry>}
 */
export function scan_entries(directory: string): Array<Entry> {
  let resolved = path.resolve(directory)
  let entry    = scan_entry(resolved)
  switch (entry.type) {
    case "null":
    case "file":
      return []
    case "directory":
      return fs.readdirSync(directory)
        .map (file => scan_entry(path.join(directory, file)))
        .sort((a, b) => {
          let left = 0
          let right = 0
          switch (a.type) {
            case "file":      left = 0; break;
            case "directory": left = 1; break;
            case "null":      left = 2; break;
          }
          switch (b.type) {
            case "file":      right = 0; break;
            case "directory": right = 1; break;
            case "null":      right = 2; break;
          }
          return +(left > right) || +(left === right) - 1;
        })
  }
}

/**
 * (synchronous) preforms a depth-first recursive scan of the given directory.
 * @param {string} the directory to scan.
 * @returns {Array<Entry>}
 */
export function scan_entries_recurisve(directory: string): Array<Entry> {
  let rootEntry = scan_entry(path.resolve(directory))
  return scan_entries(rootEntry.fullname).reduce((acc, entry) => {
    switch(entry.type) {
      case "null":
      case "file":
        acc.push(entry)
        break;
      case "directory":
        acc.push(entry)
        scan_entries_recurisve(entry.fullname)
          .forEach(entry => acc.push(entry))
        break;
    }
    return acc
  }, new Array<Entry>())
}