//--------------------------------------------
// run: node tests [test-name]
//--------------------------------------------

"use strict";

let task = require("../tasksmith.js")

/** long running process to test parallism. */
let long_running_task = (id) => task.script(task => {
  let count = 0
  let handle = setInterval(() => {
    if(count < 10) {
      task.echo("process: " + id + " : " + count)
      count++
    } else {
      clearInterval(handle)
      task.done()
    }
  }, 500)
})

/** shell echo test */
let test_shell = () => task.series([
  task.series([
    task.shell("echo hello"),
    task.delay(1000),
    task.shell("echo world")
  ])
])

/** script echo test */
let test_script = () => task.series([
  task.series([
    task.script(task => {
      task.echo("hello")
      task.done()
    }),
    task.delay(1000),
    task.script(task => {
      task.echo("world")
      task.done()
    })
  ])
])

/** test running multiple things at once. */
let test_parallel = () => task.series([
  task.parallel([
    long_running_task(0),
    long_running_task(1),
    long_running_task(2),
    long_running_task(3),
  ]),
  task.echo("waiting..."),
  task.delay(1000),
  task.parallel([
    long_running_task(4),
    long_running_task(5),
    long_running_task(6),
    long_running_task(7),
  ]),
])

/** a small cli.. */
let cli = task.cli(process.argv, {
  "test-shell"   : test_shell   (),
  "test-script"  : test_script  (),
  "test-parallel": test_parallel(),
  "test-all"     : task.series([
    test_shell(),
    test_script(),
    test_parallel()
  ]),
  "test-all-parallel": task.parallel([
    test_shell(),
    test_script(),
    test_parallel()
  ])
})
cli.on("data",  data  => process.stdout.write(data))
   .on("error", error => process.stdout.write(error.message))
   .on("end",   ()    => console.log("finished"))
   .run()
