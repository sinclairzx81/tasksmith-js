//-------------------------------------------------------
// tasksmith: website-typescript-react-less starter.
//-------------------------------------------------------

"use strict";

const task = require("../tasksmith.js")

//-------------------------------------------------------
// install:
//-------------------------------------------------------
const install = () => task.series([
  task.shell("npm install typescript -g"),
  task.shell("npm install less -g")
])

//-------------------------------------------------------
// clean:
//-------------------------------------------------------
const clean = () =>  task.series([
  task.drop("./scripts/app/app.js"),
  task.drop("./styles/style.css")
])

//-------------------------------------------------------
// build:
//-------------------------------------------------------
const build = () => task.series([
  task.shell("tsc   ./scripts/app/index.ts --jsx react --target es5 --module amd --removeComments --outFile ./scripts/app/app.js"),
  task.shell("lessc ./styles/index.less ./styles/style.css"),
])

//-------------------------------------------------------
// watch:
//-------------------------------------------------------
const watch  = () => task.parallel([
  task.shell("tsc -w ./scripts/app/index.ts --jsx react --target es5 --module amd --removeComments --outFile ./scripts/app/app.js"),
  task.watch("./styles/", () => task.shell("lessc ./styles/index.less ./styles/style.css")),
  task.serve(".", 5000, true, 1000)
])

//-------------------------------------------------------
// cli:
//-------------------------------------------------------
task.debug(task.cli(process.argv, {
  "install": install(),
  "clean"  : clean(),
  "watch"  : watch(),
  "build"  : build()
}))