"use strict";

const task = require("./bin/node/tasksmith.js")

let test = () => task.retry(10, () => task.series([
  task.ok(attempt.toString()),
  task.ok(),
  task.fail()
]))

test().subscribe(event => console.log(task.format(event))).run()
