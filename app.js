"use strict"

var task = require("./bin/node/tasksmith.js")


let mytask = () => task.append( "./file.dat", "this content will be appended.")


copy().subscribe(event => {
  console.log(task.format(event))
}).run()