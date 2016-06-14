/*--------------------------------------------------------------------------

tasksmith - minimal task automation library.

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

//------------------------------------------------------
// runs a shell command.
//------------------------------------------------------
const shell = (command, exitcode) => () => new Promise((resolve, reject) => {
  console.log("shell:", command)
  exitcode = exitcode || 0
  const spawn    = require('child_process').spawn
  const windows  = /^win/.test(process.platform)
  let proc = spawn(windows ? 'cmd' : 'sh', [windows ? '/c':'-c', command])
  proc.stdout.setEncoding("utf8")
  proc.stdout.on("data",  (data)  => process.stdout.write(data))
  proc.stdout.on("error", (error) => reject(error))
  proc.on("error",        (error) => reject(error))
  proc.on("close",        (code)  => {
    if(exitcode !== code) reject("shell: unexpected exit code. expected " + exitcode + " got " + code)
    else resolve()
  })
})

//------------------------------------------------------
// concatinates the given files.
//------------------------------------------------------
const concat = (dst, files) => () => new Promise((resolve, reject) => {
  const fs = require("fs")
  console.log("concat:", files, "->", dst)
  let output  = files.map(file => fs.readFileSync(file, "utf8")).join("\n")
  fs.writeFileSync(dst, output)
  resolve()
})

//------------------------------------------------------
// appends this file with the given content.
//------------------------------------------------------
const append = (file, content) => () => new Promise((resolve, reject) => {
  const fs = require("fs")
  console.log("concat:", file, "->", content)
  fs.writeFileSync(file, [ fs.readFileSync(file, "utf8"), content].join("\n"))
  resolve()
})

//------------------------------------------------------
// mini cli ...
//------------------------------------------------------
const cli = (argv, tasks) => () => {
  let args = process.argv.reduce((acc, c, index) => {
    if(index > 1) acc.push(c)
    return acc
  }, [])
  if(args.length !== 1 || tasks[args[0]] === undefined) {
    console.log("[tasksmith-build-tasks]")
    console.log("tasks:")
    Object.keys(tasks).forEach(key => console.log([" - ", key].join('')))
  } else {
    console.log("running: " + args[0])
    tasks[args[0]].reduce((cur, next) => cur.then(next), Promise.resolve())
                  .then(() => console.log("done"))
                  .catch(error => console.log(error))
  }
}

//------------------------------------------------------
// scripts...
//------------------------------------------------------
const clean = [ shell("rm -rf ./bin") ]
const build = [
  shell ("tsc -p ./src/build/boot/tsconfig.json       --outFile ./bin/boot.js"),
  shell ("tsc -p ./src/build/tasksmith/tsconfig.json  --outFile ./bin/tasksmith.js"),
  concat("./bin/tasksmith.js", [ "./license",  "./bin/boot.js", "./bin/tasksmith.js" ]),
  append("./bin/tasksmith.js", "module.exports = __collect();"),
  shell ("rm -rf ./bin/boot.js")
]
const program = cli(process.argv, {
  "build" : build,
  "clean" : clean,
})
program()