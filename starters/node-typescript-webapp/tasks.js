//-------------------------------------------------------
// tasksmith: node typescript webapp starter.
//-------------------------------------------------------

"use strict";

const task = require("../tasksmith.js")

//-------------------------------------------------------
// clean:
//-------------------------------------------------------
const clean = () => task.drop("./bin")

//-------------------------------------------------------
// install:
//-------------------------------------------------------
const install = () => task.series([
  // todo: install npm modules.
])

//-------------------------------------------------------
// watch:
//-------------------------------------------------------
const watch = () => task.parallel([
  task.shell("tsc -w ./src/app.ts --moduleResolution node --module commonjs --target es6 --removeComments --outDir ./bin"),
  task.shell("tsc  -w ./src/public/scripts/app.ts --target es5 --removeComments --outFile ./bin/public/scripts/app.js"),
  task.watch("./src/public/styles",     () => task.shell ("lessc ./src/public/styles/index.less ./bin/public/styles/style.css")),
  task.watch("./src/public/index.html", () => task.copy  ("./src/public/index.html", "./bin/public")),
  task.retry(10, () => task.delay(1000, () => task.watch([
    "./bin/public/scripts/app.js",
    "./bin/public/styles/style.css",
    "./bin/app.js"
  ], () => task.shell("node ./bin/app.js"))))
])

//-------------------------------------------------------
// cli:
//-------------------------------------------------------
task.debug(task.cli(process.argv, {
  "clean"     : clean(),
  "install"   : install(),
  "watch"     : watch()
}))

