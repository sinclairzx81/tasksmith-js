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

"use strict";

//------------------------------------------
// (support) executes this shell script.
//------------------------------------------
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

//------------------------------------------
// (support) concatinates the given files together.
//------------------------------------------
const concat = (dst, files) => () => new Promise((resolve, reject) => {
  const fs = require("fs")
  console.log("concat:", files, "->", dst)
  let output  = files.map(file => fs.readFileSync(file, "utf8")).join("\n")
  fs.writeFileSync(dst, output)
  resolve()
})

//------------------------------------------
// (support) appends this file with the given string content.
//------------------------------------------
const append = (file, content) => () => new Promise((resolve, reject) => {
  const fs = require("fs")
  console.log("concat:", file, "->", content)
  fs.writeFileSync(file, [ fs.readFileSync(file, "utf8"), content].join("\n"))
  resolve()
})
//------------------------------------------
// (support) drops the given filename.
//------------------------------------------
const drop = (file) => () => new Promise((resolve, reject) => {
  const fs = require("fs")
  console.log("drop:", file)
  fs.unlinkSync(file)
  resolve()
})


//------------------------------------------
// (support) creates a small cli to execute tasks.
//------------------------------------------
const cli = (argv, tasks) => () => {
  let args = process.argv.reduce((acc, c, index) => {
    if(index > 1) acc.push(c)
    return acc
  }, [])
  if(args.length !== 1 || tasks[args[0]] === undefined) {
    console.log("[tasksmith-support-tasks]")
    console.log("tasks:")
    Object.keys(tasks).forEach(key => console.log([" - ", key].join('')))
  } else {
    console.log("running: " + args[0])
    tasks[args[0]].reduce((cur, next) => cur.then(next), Promise.resolve())
                  .then(() => console.log("done"))
                  .catch(error => console.log(error))
  }
}

//------------------------------------------
// (task) cleans bin directory.
//------------------------------------------
const clean = () => [ shell("rm -rf ./bin") ]

//------------------------------------------
// (task) builds browser profile.
//------------------------------------------
const build_browser = () => [
  shell ("tsc ./src/tasksmith-browser.ts --removeComments --module amd --target es5 --lib es2015,dom --declaration --outFile ./bin/browser/tasksmith.js"),
]

//------------------------------------------
// (task) builds node profile.
//------------------------------------------
const build_node = () => [
  shell ("tsc ./src/boot.ts --removeComments --outFile ./bin/node/boot.js"),
  shell ("tsc ./src/tasksmith-node.ts --removeComments --module amd --target es5 --lib es2015,dom --declaration --outFile ./bin/node/tasksmith.js"),
  concat("./bin/node/tasksmith.js", [ "./license",  "./bin/node/boot.js", "./bin/node/tasksmith.js" ]),
  append("./bin/node/tasksmith.js", "module.exports = collect();"),
  drop  ("./bin/node/boot.js")
]



//------------------------------------------
// (task) builds everything.
//------------------------------------------
const build = () => build_browser().concat(build_node())

/** the cli configuration. */
cli(process.argv, {
  "build-node"    : build_node(),
  "build-browser" : build_browser(),
  "build"         : build(),
  "clean"         : clean()
})()