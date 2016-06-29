//-------------------------------------------------------
// tasksmith: node typescript module starter.
//-------------------------------------------------------

"use strict";

const task = require("../tasksmith.js")

//-------------------------------------------------------
// modname: should match /node_modules/[modname]
//-------------------------------------------------------
const modname = "starter"

//-------------------------------------------------------
// install:
//-------------------------------------------------------
const install = () => task.shell("npm install typescript -g")

//-------------------------------------------------------
// clean:
//-------------------------------------------------------
const clean = () => task.series([
  task.trycatch(() => task.drop("./node_modules/" + modname + "/bin"), () => task.ok()),
  task.trycatch(() => task.drop("./bin"),    () => task.ok())
])

//-------------------------------------------------------
// build:
//-------------------------------------------------------
const build = () => task.series([
  task.shell  ("tsc ./node_modules/" + modname + "/src/index.ts --target es6 --module amd --removeComments --declaration --outFile ./bin/" + modname + "/index.js"),
  task.shell  ("tsc ./node_modules/" + modname + "/src/amd/amd-boot.ts --removeComments --outFile ./bin/" + modname + "/amd-boot.js"),
  task.concat ("./bin/" + modname + "/index.js", ["./bin/" + modname + "/amd-boot.js", "./bin/" + modname + "/index.js"]),
  task.append ("./bin/" + modname + "/index.js", "module.exports = collect()"),
  task.drop   ("./bin/" + modname + "/amd-boot.js")
])

//-------------------------------------------------------
// watch:
//-------------------------------------------------------
const watch  = () => task.parallel([
   task.shell  ("tsc -w ./node_modules/" + modname + "/src/index.ts --moduleResolution node --module commonjs --target es6 --outDir ./node_modules/" + modname + "/bin/"),
   task.retry  (100, () => 
    task.delay (2000, () => 
      task.watch("./", () => 
        task.shell("node ./app.js"))))
])

//-------------------------------------------------------
// cli:
//-------------------------------------------------------
const cli = () => task.cli(process.argv, {
  "install"   : install(),
  "clean"     : clean(),
  "watch"     : watch(),
  "build"     : build()
})

task.debug(cli())