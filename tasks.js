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

/**
 * creates a micro cli for running tasks. 
 * @param {string} argv the process.argv argument..
 * @param {any} tasks a object collection of tasks.
 * @returns {Promise}
 */
const cli = (argv, tasks) => new Promise((resolve, reject) => {
  let task = argv.slice(2, argv.length)[0]
  if(task === undefined || tasks[task] === undefined) {
    console.log("[tasksmith micro cli]")
    Object.keys(tasks).forEach(task => {
      console.log(` - ${task}`)
    });; resolve()
  } else {
    tasks[task]()
      .then(resolve)
      .catch(reject)
  }
})

/**
 * executes the given shell script. 
 * @param {string} command to execute.
 * @param {number} exitcode the expected exit code.
 * @returns {Promise}
 */
const shell = (command, exitcode = 0) => new Promise((resolve, reject) => {
  const spawn    = require('child_process').spawn
  const windows  = /^win/.test(process.platform)
  let proc       = spawn(windows ? 'cmd' : 'sh', [windows ? '/c':'-c', command])
  proc.stdout.setEncoding("utf8")
  proc.stdout.on("data",  data  => process.stdout.write(data))
  proc.stdout.on("error", error => reject(error))
  proc.on("close",        code  => {
    (exitcode !== code) 
      ? reject(exitcode)
      : resolve()
  })
})

/**
 * cleans the project directories.
 * @returns {Promise}
 */
const clean = () => shell("rm -rf ./bin")

/**
 * builds the tasksmith project.
 * @returns {Promise}
 */
const build = () => new Promise((resolve, reject) => {
  shell("cd ./src && tsc-bundle index.ts ../bin/lib/tasksmith.js").then(() => {
    const fs = require("fs")
    let license = fs.readFileSync("./license", "utf8")
    fs.writeFileSync("./bin/lib/tasksmith.js", [
      license, "\n", "module.exports = ", 
      fs.readFileSync("./bin/lib/tasksmith.js", "utf8")
    ].join(""))
    resolve()
  }).catch(reject)
})


cli(process.argv, {
  "clean": clean,
  "build": build
}).then(() => {
  console.log("done")
})
.catch(error => {
  console.log(error)
})