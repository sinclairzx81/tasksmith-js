"use strict";

let task = require("./bin/tasksmith.js")

let mytask = task.series([
  task.ok   ("running task 1"),
  task.ok   ("running task 2"),
  task.fail ("running task 3"),
  task.ok   ("running task 4"),
])

// subscribe and run.
mytask.subscribe(event => {
  console.log(task.format(event))
}).run()