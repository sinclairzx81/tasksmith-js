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
module.exports = (function () {
  var main = null;
  var modules = {
      "require": {
          factory: undefined,
          dependencies: [],
          exports: function (args, callback) { return require(args, callback); },
          resolved: true
      }
  };
  function define(id, dependencies, factory) {
      return main = modules[id] = {
          dependencies: dependencies,
          factory: factory,
          exports: {},
          resolved: false
      };
  }
  function resolve(definition) {
      if (definition.resolved === true)
          return;
      definition.resolved = true;
      var dependencies = definition.dependencies.map(function (id) {
          return (id === "exports")
              ? definition.exports
              : (function () {
                  if(modules[id] !== undefined) {
                    resolve(modules[id]);
                    return modules[id].exports;
                  } else return require(id)
              })();
      });
      definition.factory.apply(null, dependencies);
  }
  function collect() {
      Object.keys(modules).map(function (key) { return modules[key]; }).forEach(resolve);
      return (main !== null) 
        ? main.exports
        : undefined
  }

  define("core/task", ["require", "exports"], function (require, exports) {
      "use strict";
      var TaskContext = (function () {
          function TaskContext(_resolve, _reject, _log) {
              this._resolve = _resolve;
              this._reject = _reject;
              this._log = _log;
              this._completed = false;
              this._cancelled = false;
              this._abort = function () { };
          }
          TaskContext.prototype.log = function (data) {
              if (this._completed === false) {
                  this._log(data);
              }
          };
          TaskContext.prototype.ok = function () {
              if (this._completed === false) {
                  this._completed = true;
                  this._resolve();
                  this._abort();
              }
          };
          TaskContext.prototype.fail = function (reason) {
              if (this._completed === false) {
                  this._completed = true;
                  this._reject(reason);
                  this._abort();
              }
          };
          TaskContext.prototype.cancel = function () {
              if (this._cancelled === false) {
                  this._cancelled = true;
                  this._abort();
              }
          };
          TaskContext.prototype.abort = function (func) {
              this._abort = func;
          };
          return TaskContext;
      }());
      exports.TaskContext = TaskContext;
      var Task = (function () {
          function Task(func) {
              this.func = func;
              this._state = "pending";
              this._cancelled = false;
          }
          Task.prototype.run = function (log) {
              var _this = this;
              if (log === void 0) { log = function (data) { }; }
              if (this._cancelled === true) {
                  return Promise.reject("this task has been cancelled prior to commencement.");
              }
              else {
                  switch (this._state) {
                      case "ok":
                      case "fail":
                      case "running":
                          return Promise.reject("cannot run task in non pending state.");
                      case "pending":
                          return new Promise(function (resolve, reject) {
                              _this._state = "running";
                              _this._context = new TaskContext(function () { _this._state = "ok"; resolve(); }, function (data) { _this._state = "fail"; reject(data); }, function (data) { log(data); });
                              _this.func(_this._context);
                          });
                  }
              }
          };
          Task.prototype.cancel = function () {
              if (this._cancelled === false) {
                  this._cancelled = true;
                  switch (this._state) {
                      case "ok":
                      case "fail":
                      case "pending":
                          break;
                      case "running":
                          this._context.cancel();
                          break;
                  }
              }
          };
          return Task;
      }());
      exports.Task = Task;
  });
  define("common/signature", ["require", "exports"], function (require, exports) {
      "use strict";
      exports.reflect = function (obj) {
          if (obj === undefined)
              return "undefined";
          if (obj === null)
              return "null";
          if (typeof obj === "function")
              return "function";
          if (typeof obj === "string")
              return "string";
          if (typeof obj === "number")
              return "number";
          if (typeof obj === "boolean")
              return "boolean";
          if (typeof obj === "object") {
              if (obj instanceof Array)
                  return "array";
              if (obj instanceof Date)
                  return "date";
              if (obj instanceof RegExp)
                  return "regex";
          }
          return "object";
      };
      exports.compare_type = function (left, right) {
          var a = left.split("|").map(function (type) { return type.trim(); }).filter(function (type) { return type.length > 0; });
          var b = right.split("|").map(function (type) { return type.trim(); }).filter(function (type) { return type.length > 0; });
          if (a.indexOf("any") !== -1)
              return true;
          if (b.indexOf("any") !== -1)
              return true;
          for (var i = 0; i < a.length; i += 1) {
              for (var j = 0; j < b.length; j += 1) {
                  if (a[i] === b[j])
                      return true;
              }
          }
          return false;
      };
      exports.compare_type_array = function (left, right) {
          if (left.length !== right.length)
              return false;
          for (var i = 0; i < left.length; i += 1) {
              if (exports.compare_type(left[i], right[i]) === false)
                  return false;
          }
          return true;
      };
      var Signature = (function () {
          function Signature(args) {
              this.args = args;
              this.mappings = new Array();
              this.errorfuncs = new Array();
          }
          Signature.prototype.map = function (typenames, func) {
              if (func === void 0) { func = function () {
                  var args = [];
                  for (var _i = 0; _i < arguments.length; _i++) {
                      args[_i] = arguments[_i];
                  }
                  return args;
              }; }
              this.mappings.push({ typenames: typenames, func: func });
              return this;
          };
          Signature.prototype.err = function (func) {
              this.errorfuncs.push(func);
              return this;
          };
          Signature.prototype.run = function (func) {
              var typenames = this.args.map(function (arg) { return exports.reflect(arg); });
              var mapping = this.mappings.find(function (mapping) { return exports.compare_type_array(mapping.typenames, typenames); });
              if (mapping === undefined) {
                  this.raiseError();
              }
              else {
                  return func.apply({}, mapping.func.apply({}, this.args));
              }
          };
          Signature.prototype.raiseError = function () {
              var buffer = [];
              buffer.push("signature error:");
              buffer.push("params:");
              buffer.push("  (" + this.args.map(function (arg) { return exports.reflect(arg); }).join(", ") + ")");
              buffer.push("expect:");
              this.mappings.forEach(function (mapping) { return buffer.push("  (" + mapping.typenames.join(", ") + ")"); });
              var error = buffer.join("\n");
              if (this.errorfuncs.length > 0)
                  this.errorfuncs.forEach(function (func) { return func(error); });
              else
                  throw Error(error);
          };
          return Signature;
      }());
      exports.Signature = Signature;
      function signature(args) {
          return new Signature(args);
      }
      exports.signature = signature;
  });
  define("core/create", ["require", "exports", "common/signature", "core/task"], function (require, exports, signature_1, task_1) {
      "use strict";
      function create() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return new task_1.Task(function (context) { return signature_1.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["string", "function"])
              .map(["function"], function (func) { return ["unnamed", func]; })
              .run(function (name, func) {
              context.log(name + ":::begin");
              var inner = new task_1.TaskContext(function () {
                  context.log(name + ":::end");
                  context.ok();
              }, function (reason) {
                  context.log(name + ":::failed");
                  context.fail(reason);
              }, function (data) {
                  context.log(name + ":::" + data);
              });
              func(inner);
              context.abort(function () {
                  inner.cancel();
                  context.fail("aborted");
              });
          }); });
      }
      exports.create = create;
  });
  define("core/cli", ["require", "exports", "common/signature", "core/create"], function (require, exports, signature_2, create_1) {
      "use strict";
      function cli() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_1.create("core/cli", function (context) { return signature_2.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["array", "object"])
              .run(function (argv, options) {
              var argument = argv.slice(2);
              if (argument.length === 0 || options[argument[0]] === undefined) {
                  context.log("cli options:");
                  Object.keys(options).forEach(function (key) { return context.log(" - " + key); });
                  context.ok();
                  return;
              }
              context.log("running task: " + argument[0]);
              var cancelled = false;
              var current = options[argument[0]];
              current.run(function (data) { return context.log(data); })
                  .then(function () { return context.ok(); })
                  .catch(function (error) { return context.fail(error); });
              context.abort(function () {
                  cancelled = true;
                  current.cancel();
                  context.fail("aborted");
              });
          }); });
      }
      exports.cli = cli;
  });
  define("core/debug", ["require", "exports"], function (require, exports) {
      "use strict";
      function pad(data, pad) {
          var buffer = [];
          for (var i = 0; i < pad; i++) {
              if (i < data.length) {
                  buffer.push(data.charAt(i));
              }
              else {
                  buffer.push(' ');
              }
          }
          return buffer.join('');
      }
      function debug(data) {
          var tree = data.split(':::')
              .map(function (part) { return part; })
              .map(function (part, index, array) {
              if (index < (array.length - 2)) {
                  if (index === (array.length - 3)) {
                      return "├─";
                  }
                  return "| ";
              }
              return part.trim();
          });
          var message = tree.pop();
          console.log('\x1b[32m', pad(tree.join(''), 24), '\x1b[0m', "|", message);
      }
      exports.debug = debug;
  });
  define("core/fail", ["require", "exports", "core/create"], function (require, exports, create_2) {
      "use strict";
      exports.fail = function (message) {
          if (message === void 0) { message = ""; }
          return create_2.create("core/fail", function (context) { return context.fail(message); });
      };
  });
  define("core/delay", ["require", "exports", "common/signature", "core/create"], function (require, exports, signature_3, create_3) {
      "use strict";
      function delay() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_3.create("core/delay", function (context) { return signature_3.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["number", "object"])
              .map(["number"], function (ms) { return [ms, undefined]; })
              .run(function (ms, task) {
              var handle = setTimeout(function () {
                  if (task === undefined) {
                      context.ok();
                  }
                  else {
                      task.run(function (data) { return context.log(data); })
                          .then(function () { return context.ok(); })
                          .catch(function (error) { return context.fail(error); });
                  }
              }, ms);
              context.abort(function () {
                  clearTimeout(handle);
                  if (task !== undefined)
                      task.cancel();
                  context.fail("aborted");
              });
          }); });
      }
      exports.delay = delay;
  });
  define("core/noop", ["require", "exports", "core/create"], function (require, exports, create_4) {
      "use strict";
      exports.noop = function () { return create_4.create("core/noop", function (context) { return context.ok(); }); };
  });
  define("core/each", ["require", "exports", "common/signature", "core/create", "core/noop"], function (require, exports, signature_4, create_5, noop_1) {
      "use strict";
      function each() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_5.create("core/each", function (context) { return signature_4.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["array", "function"])
              .run(function (elements, func) {
              var current = noop_1.noop();
              var cancelled = false;
              (function step() {
                  if (cancelled)
                      return;
                  if (elements.length === 0) {
                      context.ok();
                  }
                  else {
                      current = func(elements.shift());
                      current.run(function (data) { return context.log(data); })
                          .then(function () { return step(); })
                          .catch(function (error) { return context.fail(error); });
                  }
              }());
              context.abort(function () {
                  cancelled = true;
                  current.cancel();
                  context.fail("aborted");
              });
          }); });
      }
      exports.each = each;
  });
  define("core/ifelse", ["require", "exports", "common/signature", "core/create", "core/noop"], function (require, exports, signature_5, create_6, noop_2) {
      "use strict";
      function ifelse() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_6.create("core/ifelse", function (context) { return signature_5.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["boolean", "object", "object"])
              .map(["boolean", "object"], function (condition, ifTask) { return [condition, ifTask, noop_2.noop()]; })
              .run(function (condition, ifTask, elseTask) {
              if (condition) {
                  ifTask.run(function (data) { return context.log(data); })
                      .then(function () { return context.ok(); })
                      .catch(function (error) { return context.fail(error); });
              }
              else {
                  elseTask.run(function (data) { return context.log(data); })
                      .then(function () { return context.ok(); })
                      .catch(function (error) { return context.fail(error); });
              }
              context.abort(function () {
                  ifTask.cancel();
                  elseTask.cancel();
                  context.fail("aborted");
              });
          }); });
      }
      exports.ifelse = ifelse;
  });
  define("core/ok", ["require", "exports", "core/create"], function (require, exports, create_7) {
      "use strict";
      exports.ok = function () { return create_7.create("core/ok", function (context) { return context.ok(); }); };
  });
  define("core/parallel", ["require", "exports", "common/signature", "core/create"], function (require, exports, signature_6, create_8) {
      "use strict";
      function parallel() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_8.create("core/parallel", function (context) { return signature_6.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["array"])
              .run(function (tasks) {
              var promises = tasks.map(function (task) {
                  return task.run(function (data) {
                      return context.log(data);
                  });
              });
              Promise.all(promises)
                  .then(function () { return context.ok(); })
                  .catch(function (error) { return context.fail(error); });
              context.abort(function () {
                  tasks.forEach(function (task) { return task.cancel(); });
                  context.fail("aborted");
              });
          }); });
      }
      exports.parallel = parallel;
  });
  define("core/repeat", ["require", "exports", "common/signature", "core/create", "core/noop"], function (require, exports, signature_7, create_9, noop_3) {
      "use strict";
      function repeat() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_9.create("core/repeat", function (context) { return signature_7.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["number", "function"])
              .run(function (iterations, func) {
              var current = noop_3.noop();
              var cancelled = false;
              var iteration = 0;
              (function step() {
                  if (cancelled)
                      return;
                  if (iteration >= iterations) {
                      context.ok();
                  }
                  else {
                      iteration += 1;
                      current = func();
                      current.run(function (data) { return context.log(data); })
                          .then(function () { return step(); })
                          .catch(function (error) { return context.fail(error); });
                  }
              }());
              context.abort(function () {
                  cancelled = true;
                  current.cancel();
                  context.fail("aborted");
              });
          }); });
      }
      exports.repeat = repeat;
  });
  define("core/retry", ["require", "exports", "common/signature", "core/create", "core/noop"], function (require, exports, signature_8, create_10, noop_4) {
      "use strict";
      function retry() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_10.create("core/retry", function (context) { return signature_8.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["number", "function"])
              .run(function (retries, func) {
              var current = noop_4.noop();
              var cancelled = false;
              var attempts = 0;
              var lasterror = undefined;
              (function step() {
                  if (cancelled)
                      true;
                  if (attempts >= retries) {
                      context.fail(lasterror);
                  }
                  else {
                      attempts += 1;
                      current = func();
                      current
                          .run(function (data) { return context.log(data); })
                          .then(function () { return context.ok(); })
                          .catch(function (error) {
                          lasterror = error;
                          step();
                      });
                  }
              }());
              context.abort(function () {
                  cancelled = true;
                  current.cancel();
                  context.fail("aborted");
              });
          }); });
      }
      exports.retry = retry;
  });
  define("core/series", ["require", "exports", "common/signature", "core/create", "core/noop"], function (require, exports, signature_9, create_11, noop_5) {
      "use strict";
      function series() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_11.create("core/series", function (context) { return signature_9.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["array"])
              .run(function (tasks) {
              var cancelled = false;
              var current = noop_5.noop();
              (function step() {
                  if (cancelled)
                      return;
                  if (tasks.length === 0) {
                      context.ok();
                  }
                  else {
                      current = tasks.shift();
                      current.run(function (data) { return context.log(data); })
                          .then(function () { return step(); })
                          .catch(function (error) { return context.fail(error); });
                  }
              }());
              context.abort(function () {
                  cancelled = true;
                  current.cancel();
                  tasks.forEach(function (task) { return task.cancel(); });
                  context.fail("aborted");
              });
          }); });
      }
      exports.series = series;
  });
  define("system/shell/process", ["require", "exports", "child_process", "events"], function (require, exports, child_process, events) {
      "use strict";
      var Process = (function () {
          function Process(command) {
              var _this = this;
              this.command = command;
              this.events = new events.EventEmitter();
              this.encoding = "utf8";
              this.windows = /^win/.test(process.platform);
              this.running = true;
              this.child = child_process.spawn(this.windows ? 'cmd' : 'sh', [this.windows ? '/c' : '-c', this.command]);
              this.child.stdout.setEncoding(this.encoding);
              this.child.stderr.setEncoding(this.encoding);
              this.child.stdout.on("data", function (data) {
                  if (_this.running) {
                      _this.events.emit("data", data);
                  }
              });
              this.child.stderr.on("data", function (data) {
                  if (_this.running) {
                      _this.events.emit("data", data);
                  }
              });
              this.child.on("close", function () { return _this.dispose(); });
              this.child.on("exit", function (code, signal) {
                  if (_this.running) {
                      _this.running = false;
                      _this.events.emit("end", code);
                  }
              });
          }
          Process.prototype.on = function (event, func) {
              this.events.on(event, func);
              return this;
          };
          Process.prototype.dispose = function () {
              if (this.running) {
                  if (this.windows === true) {
                      child_process.exec('taskkill /pid ' + this.child.pid + ' /T /F');
                  }
                  else {
                      this.child.kill("SIGINT");
                  }
              }
          };
          return Process;
      }());
      exports.Process = Process;
  });
  define("core/shell", ["require", "exports", "system/shell/process", "common/signature", "core/create"], function (require, exports, process_1, signature_10, create_12) {
      "use strict";
      function shell() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_12.create("core/shell", function (context) { return signature_10.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["string", "number"])
              .map(["string"], function (command) { return [command, 0]; })
              .run(function (command, exitcode) {
              var _process;
              try {
                  _process = new process_1.Process(command);
                  _process.on("data", function (data) { return context.log(data); });
                  _process.on("end", function (code) {
                      if (code !== exitcode) {
                          context.fail("unexpected exitcode. expected " + exitcode + " got " + code);
                      }
                      else {
                          context.ok();
                      }
                  });
              }
              catch (error) {
                  context.fail(error);
              }
              context.abort(function () {
                  if (_process !== undefined) {
                      _process.dispose();
                  }
                  context.fail("abort");
              });
          }); });
      }
      exports.shell = shell;
  });
  define("core/timeout", ["require", "exports", "common/signature", "core/create"], function (require, exports, signature_11, create_13) {
      "use strict";
      function timeout() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_13.create("core/timeout", function (context) { return signature_11.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["number", "object"])
              .run(function (ms, task) {
              task.run(function (data) { return context.log(data); })
                  .then(function () { return context.ok(); })
                  .catch(function (error) { return context.fail(error); });
              var handle = setTimeout(function () {
                  context.fail();
              }, ms);
              context.abort(function () {
                  clearTimeout(handle);
                  task.cancel();
                  context.fail("aborted");
              });
          }); });
      }
      exports.timeout = timeout;
  });
  define("core/trycatch", ["require", "exports", "common/signature", "core/create", "core/noop"], function (require, exports, signature_12, create_14, noop_6) {
      "use strict";
      function trycatch() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_14.create("core/trycatch", function (context) { return signature_12.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["object", "object"])
              .map(["object"], function (tryTask) { return [tryTask, noop_6.noop()]; })
              .run(function (tryTask, catchTask) {
              tryTask.run(function (data) { return context.log(data); })
                  .then(function () { return context.ok(); })
                  .catch(function (error) {
                  catchTask.run(function (data) { return context.log(data); })
                      .then(function () { return context.ok(); })
                      .catch(function (error) { return context.fail(error); });
              });
              context.abort(function () {
                  tryTask.cancel();
                  catchTask.cancel();
                  context.fail("aborted");
              });
          }); });
      }
      exports.trycatch = trycatch;
  });
  define("core/watch", ["require", "exports", "common/signature", "core/create", "fs"], function (require, exports, signature_13, create_15, fs) {
      "use strict";
      var Debounce = (function () {
          function Debounce(delay) {
              this.delay = delay;
              this.handle = undefined;
          }
          Debounce.prototype.run = function (func) {
              var _this = this;
              if (this.handle !== undefined) {
                  clearTimeout(this.handle);
              }
              this.handle = setTimeout(function () {
                  func();
                  _this.handle = undefined;
              }, this.delay);
          };
          return Debounce;
      }());
      function watch() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_15.create("node/watch", function (context) { return signature_13.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["string", "function"])
              .run(function (filepath, func) {
              var debounce = new Debounce(150);
              var watcher = undefined;
              var task = undefined;
              var cancelled = false;
              var level = 0;
              var step = function () {
                  if (cancelled)
                      return;
                  level += 1;
                  if (task !== undefined) {
                      task.cancel();
                  }
                  task = func();
                  task.run(function (data) { return context.log(data); })
                      .then(function () { return level -= 1; })
                      .catch(function (error) {
                      level -= 1;
                      if (level === 0) {
                          context.fail(error);
                          watcher.close();
                      }
                  });
              };
              try {
                  watcher = fs.watch(filepath, { recursive: true }, function (event, filename) { return debounce.run(function () { return step(); }); });
                  step();
              }
              catch (e) {
                  context.log(e.message);
                  context.fail(e.message);
              }
              context.abort(function () {
                  cancelled = true;
                  if (task !== undefined)
                      task.cancel();
                  if (watcher !== undefined) {
                      watcher.close();
                  }
                  context.fail("aborted");
              });
          }); });
      }
      exports.watch = watch;
  });
  define("system/folder/scan", ["require", "exports", "path", "fs"], function (require, exports, path, fs) {
      "use strict";
      function scan_entry(filepath) {
          var resolved = path.resolve(filepath);
          var dirname = path.dirname(resolved);
          var basename = path.basename(resolved);
          try {
              var stats = fs.statSync(filepath);
              return (stats.isDirectory())
                  ? {
                      type: "directory",
                      fullname: path.join(dirname, basename),
                      dirname: dirname,
                      basename: basename,
                      stats: stats
                  } : {
                  type: "file",
                  fullname: path.join(dirname, basename),
                  dirname: dirname,
                  basename: basename,
                  stats: stats
              };
          }
          catch (e) {
              return {
                  type: "null",
                  fullname: path.join(dirname, basename),
                  dirname: dirname,
                  basename: basename
              };
          }
      }
      exports.scan_entry = scan_entry;
      function scan_entries(directory) {
          var resolved = path.resolve(directory);
          var entry = scan_entry(resolved);
          switch (entry.type) {
              case "null":
              case "file":
                  return [];
              case "directory":
                  return fs.readdirSync(directory)
                      .map(function (file) { return scan_entry(path.join(directory, file)); })
                      .sort(function (a, b) {
                      var left = 0;
                      var right = 0;
                      switch (a.type) {
                          case "file":
                              left = 0;
                              break;
                          case "directory":
                              left = 1;
                              break;
                          case "null":
                              left = 2;
                              break;
                      }
                      switch (b.type) {
                          case "file":
                              right = 0;
                              break;
                          case "directory":
                              right = 1;
                              break;
                          case "null":
                              right = 2;
                              break;
                      }
                      return +(left > right) || +(left === right) - 1;
                  });
          }
      }
      exports.scan_entries = scan_entries;
      function scan_entries_recurisve(directory) {
          var rootEntry = scan_entry(path.resolve(directory));
          return scan_entries(rootEntry.fullname).reduce(function (acc, entry) {
              switch (entry.type) {
                  case "null":
                  case "file":
                      acc.push(entry);
                      break;
                  case "directory":
                      acc.push(entry);
                      scan_entries_recurisve(entry.fullname)
                          .forEach(function (entry) { return acc.push(entry); });
                      break;
              }
              return acc;
          }, new Array());
      }
      exports.scan_entries_recurisve = scan_entries_recurisve;
  });
  define("system/folder/create", ["require", "exports", "path", "fs", "system/folder/scan"], function (require, exports, path, fs, scan_1) {
      "use strict";
      function create_stack(target) {
          var currentEntry = scan_1.scan_entry(path.resolve(target));
          var stack = [];
          while (true) {
              switch (currentEntry.type) {
                  case "directory":
                      return stack;
                  case "file":
                      throw Error("found unexpected file " + currentEntry.fullname + " while building directory creation stack.");
                  case "null":
                      stack.push(currentEntry);
                      var parentEntry = scan_1.scan_entry(currentEntry.dirname);
                      if (parentEntry.fullname === currentEntry.fullname)
                          throw Error("drive " + parentEntry.fullname + " does not exist.");
                      currentEntry = parentEntry;
                      break;
              }
          }
      }
      exports.create_stack = create_stack;
      function create(target, log) {
          if (log === void 0) { log = function () { }; }
          var outputEntry = scan_1.scan_entry(path.resolve(target));
          switch (outputEntry.type) {
              case "directory":
                  return;
              case "file":
                  throw Error("cannot create directory " + outputEntry.fullname + " because it would conflict with an existing file in this location.");
              case "null":
                  var stack = create_stack(target);
                  while (stack.length > 0) {
                      var directoryEntry = stack.pop();
                      log("creating: " + directoryEntry.fullname);
                      fs.mkdirSync(directoryEntry.fullname);
                  }
                  break;
          }
      }
      exports.create = create;
  });
  define("system/file/copy", ["require", "exports", "system/folder/scan", "fs", "path"], function (require, exports, scan_2, fs, path) {
      "use strict";
      function copy(source, target, log) {
          if (log === void 0) { log = function () { }; }
          var sourceEntry = scan_2.scan_entry(path.resolve(source));
          var targetEntry = scan_2.scan_entry(path.resolve(target));
          switch (sourceEntry.type) {
              case "null":
                  throw Error("unable to copy file " + sourceEntry.fullname + " because it doesn't exist.");
              case "directory":
                  throw Error("unable to copy file " + sourceEntry.fullname + " because it is a directory.");
              case "file":
                  break;
          }
          switch (targetEntry.type) {
              case "directory":
                  throw Error("unable to copy file " + sourceEntry.fullname + " to " + targetEntry.fullname + " because a directory exists at the target.");
              case "file":
                  fs.unlinkSync(targetEntry.fullname);
                  break;
              case "null":
                  break;
          }
          log("copying: " + sourceEntry.fullname + " to " + targetEntry.fullname);
          var BUF_LENGTH = 64 * 1024;
          var buff = new Buffer(BUF_LENGTH);
          var fdr = fs.openSync(sourceEntry.fullname, 'r');
          var fdw = fs.openSync(targetEntry.fullname, 'w');
          var bytesRead = 1;
          var pos = 0;
          while (bytesRead > 0) {
              bytesRead = fs.readSync(fdr, buff, 0, BUF_LENGTH, pos);
              fs.writeSync(fdw, buff, 0, bytesRead);
              pos += bytesRead;
          }
          fs.closeSync(fdr);
          fs.closeSync(fdw);
      }
      exports.copy = copy;
      function copyTo(source, directory, log) {
          if (log === void 0) { log = function () { }; }
          var sourceEntry = scan_2.scan_entry(path.resolve(source));
          var directoryEntry = scan_2.scan_entry(path.resolve(directory));
          var targetEntry = scan_2.scan_entry(path.resolve(path.join(directoryEntry.fullname, sourceEntry.basename)));
          switch (sourceEntry.type) {
              case "null":
                  throw Error("unable to copy file " + sourceEntry.fullname + " because it doesn't exist.");
              case "directory":
                  throw Error("unable to copy file " + sourceEntry.fullname + " because it is a directory.");
              case "file":
                  break;
          }
          switch (directoryEntry.type) {
              case "file":
                  throw Error("unable to copy file " + sourceEntry.fullname + " into " + directoryEntry.fullname + " because the directory is a file.");
              case "null":
                  throw Error("unable to copy file " + sourceEntry.fullname + " into " + directoryEntry.fullname + " because the directory does not exist.");
              case "directory":
                  break;
          }
          switch (targetEntry.type) {
              case "directory":
                  throw Error("unable to copy file " + sourceEntry.fullname + " as " + targetEntry.fullname + " because a directory of the same name exists there.");
              case "null":
                  break;
              case "file":
                  break;
          }
          copy(sourceEntry.fullname, targetEntry.fullname, log);
      }
      exports.copyTo = copyTo;
  });
  define("system/folder/copy", ["require", "exports", "system/file/copy", "system/folder/scan", "path", "fs"], function (require, exports, copy_1, scan_3, path, fs) {
      "use strict";
      function copy_stack(source, target) {
          var sourceEntry = scan_3.scan_entry(path.resolve(source));
          var targetEntry = scan_3.scan_entry(path.resolve(target));
          return scan_3.scan_entries_recurisve(sourceEntry.fullname).map(function (fromEntry) {
              var toEntry = scan_3.scan_entry(path.join(targetEntry.fullname, fromEntry.fullname.replace(sourceEntry.fullname, "")));
              return {
                  fromEntry: fromEntry,
                  toEntry: toEntry
              };
          }).reverse();
      }
      exports.copy_stack = copy_stack;
      function copy(source, target, log) {
          if (log === void 0) { log = function () { }; }
          var sourceEntry = scan_3.scan_entry(path.resolve(source));
          var targetEntry = scan_3.scan_entry(path.resolve(target));
          switch (sourceEntry.type) {
              case "null":
                  throw Error("unable to copy directory " + sourceEntry.fullname + " because it doesn't exist.");
              case "file":
                  throw Error("unable to copy directory " + sourceEntry.fullname + " because it is a file.");
              case "directory":
                  break;
          }
          switch (targetEntry.type) {
              case "file":
                  throw Error("unable to copy from " + sourceEntry.fullname + " into " + targetEntry.fullname + " because the target directory points to a file.");
              case "null":
                  throw Error("unable to copy from " + sourceEntry.fullname + " into " + targetEntry.fullname + " because the target directory doesn't exist.");
              case "directory":
                  break;
          }
          var stack = copy_stack(source, target);
          while (stack.length > 0) {
              var operation = stack.pop();
              switch (operation.fromEntry.type) {
                  case "null":
                      log("unable to copy " + operation.fromEntry.fullname + " because it doesn't exist.");
                      break;
                  case "directory":
                      switch (operation.toEntry.type) {
                          case "file":
                              log("unable to copy directory " + operation.fromEntry.fullname + " because the target " + operation.toEntry.fullname + " directory contains a file of that name.");
                              break;
                          case "directory":
                              log("skipping: " + operation.toEntry.fullname);
                              break;
                          case "null":
                              log("copying: " + operation.fromEntry.fullname + " to " + operation.toEntry.fullname);
                              fs.mkdirSync(operation.toEntry.fullname);
                              break;
                      }
                      break;
                  case "file":
                      switch (operation.toEntry.type) {
                          case "directory":
                              log("unable to copy file " + operation.fromEntry.fullname + " because the target " + operation.toEntry.fullname + " directory contains a directory of that name.");
                              break;
                          case "file":
                              copy_1.copy(operation.fromEntry.fullname, operation.toEntry.fullname, log);
                              break;
                          case "null":
                              copy_1.copy(operation.fromEntry.fullname, operation.toEntry.fullname, log);
                              break;
                      }
                      break;
              }
          }
      }
      exports.copy = copy;
  });
  define("system/folder/merge", ["require", "exports", "system/file/copy", "system/folder/scan", "path", "fs"], function (require, exports, copy_2, scan_4, path, fs) {
      "use strict";
      function merge_stack(source, target) {
          var sourceEntry = scan_4.scan_entry(path.resolve(source));
          var targetEntry = scan_4.scan_entry(path.resolve(target));
          return scan_4.scan_entries_recurisve(sourceEntry.fullname).map(function (fromEntry) {
              var toEntry = scan_4.scan_entry(path.join(targetEntry.fullname, fromEntry.fullname.replace(sourceEntry.fullname, "")));
              return {
                  fromEntry: fromEntry,
                  toEntry: toEntry
              };
          }).reverse();
      }
      exports.merge_stack = merge_stack;
      function merge(source, target, log) {
          if (log === void 0) { log = function () { }; }
          var sourceEntry = scan_4.scan_entry(path.resolve(source));
          var targetEntry = scan_4.scan_entry(path.resolve(target));
          switch (sourceEntry.type) {
              case "null":
                  throw Error("unable to copy directory " + sourceEntry.fullname + " because it doesn't exist.");
              case "file":
                  throw Error("unable to copy directory " + sourceEntry.fullname + " because it is a file.");
              case "directory":
                  break;
          }
          switch (targetEntry.type) {
              case "file":
                  throw Error("unable to merge from " + sourceEntry.fullname + " into " + targetEntry.fullname + " because the target directory points to a file.");
              case "null":
                  throw Error("unable to merge from " + sourceEntry.fullname + " into " + targetEntry.fullname + " because the target directory doesn't exist.");
              case "directory":
                  break;
          }
          var stack = merge_stack(source, target);
          while (stack.length > 0) {
              var operation = stack.pop();
              switch (operation.fromEntry.type) {
                  case "null":
                      log("unable to copy " + operation.fromEntry.fullname + " because it doesn't exist.");
                      break;
                  case "directory":
                      switch (operation.toEntry.type) {
                          case "file":
                              log("skipping: " + operation.toEntry.fullname);
                              break;
                          case "directory":
                              log("skipping: " + operation.toEntry.fullname);
                              break;
                          case "null":
                              log("copying: " + operation.fromEntry.fullname + " to " + operation.toEntry.fullname);
                              fs.mkdirSync(operation.toEntry.fullname);
                              break;
                      }
                      break;
                  case "file":
                      switch (operation.toEntry.type) {
                          case "file":
                              log("skipping: " + operation.toEntry.fullname);
                              break;
                          case "directory":
                              log("skipping: " + operation.toEntry.fullname);
                              break;
                          case "null":
                              copy_2.copy(operation.fromEntry.fullname, operation.toEntry.fullname, log);
                              break;
                      }
                      break;
              }
          }
      }
      exports.merge = merge;
  });
  define("system/folder/drop", ["require", "exports", "path", "fs", "system/folder/scan"], function (require, exports, path, fs, scan_5) {
      "use strict";
      function drop_stack(directory) {
          var rootEntry = scan_5.scan_entry(path.resolve(directory));
          var stack = scan_5.scan_entries_recurisve(rootEntry.fullname);
          stack.unshift(rootEntry);
          return stack;
      }
      exports.drop_stack = drop_stack;
      function drop(target, log) {
          if (log === void 0) { log = function () { }; }
          var rootEntry = scan_5.scan_entry(path.resolve(target));
          switch (rootEntry.type) {
              case "null":
                  return;
              case "file":
                  throw Error("cannot drop directory " + rootEntry.fullname + " because its a file.");
              case "directory":
                  var stack = drop_stack(rootEntry.fullname);
                  while (stack.length > 0) {
                      var dropEntry = stack.pop();
                      switch (dropEntry.type) {
                          case "null": break;
                          case "directory":
                              log("dropping: " + dropEntry.fullname);
                              fs.rmdirSync(dropEntry.fullname);
                              break;
                          case "file":
                              log("dropping: " + dropEntry.fullname);
                              fs.unlinkSync(dropEntry.fullname);
                              break;
                      }
                  }
          }
      }
      exports.drop = drop;
  });
  define("system/folder/rename", ["require", "exports", "path", "fs", "system/folder/scan"], function (require, exports, path, fs, scan_6) {
      "use strict";
      function rename(directory, newname, log) {
          if (log === void 0) { log = function () { }; }
          if (newname.indexOf("/") !== -1 || newname.indexOf("\\") !== -1) {
              throw Error("folder newname argument cannot be a path.");
          }
          var sourceEntry = scan_6.scan_entry(path.resolve(directory));
          var targetEntry = scan_6.scan_entry(path.join(sourceEntry.dirname, newname));
          switch (sourceEntry.type) {
              case "null":
                  throw Error("unable to rename directory " + sourceEntry.fullname + " because it doesn't exist.");
              case "file":
                  throw Error("unable to rename directory " + sourceEntry.fullname + " because it is a file.");
              case "directory":
                  break;
          }
          switch (targetEntry.type) {
              case "file":
                  throw Error("unable to rename directory " + sourceEntry.fullname + " to " + targetEntry.fullname + " because an existing file of that name already exists.");
              case "directory":
                  throw Error("unable to rename directory " + sourceEntry.fullname + " to " + targetEntry.fullname + " because an existing directory of that name already exists.");
              case "null":
                  break;
          }
          log("renaming: " + sourceEntry.fullname + " to " + targetEntry.basename);
          fs.renameSync(sourceEntry.fullname, targetEntry.fullname);
      }
      exports.rename = rename;
  });
  define("system/folder/move", ["require", "exports", "path", "fs", "system/folder/scan"], function (require, exports, path, fs, scan_7) {
      "use strict";
      function move(source, target, log) {
          if (log === void 0) { log = function () { }; }
          var sourceEntry = scan_7.scan_entry(path.resolve(source));
          var targetEntry = scan_7.scan_entry(path.resolve(target));
          var outputEntry = scan_7.scan_entry(path.join(targetEntry.dirname, targetEntry.basename, sourceEntry.basename));
          switch (sourceEntry.type) {
              case "null":
                  throw Error("unable to move directory " + sourceEntry.fullname + " because it doesn't exist.");
              case "file":
                  throw Error("unable to move directory " + sourceEntry.fullname + " because it is a file.");
              case "directory":
                  break;
          }
          switch (targetEntry.type) {
              case "file":
                  throw Error("unable to move directory from " + sourceEntry.fullname + " to " + targetEntry.fullname + " because the target directory points to a file.");
              case "null":
                  throw Error("unable to move directory from " + sourceEntry.fullname + " to " + targetEntry.fullname + " because the target directory doesn't exist.");
              case "directory":
                  break;
          }
          switch (outputEntry.type) {
              case "file":
                  throw Error("unable to move directory from " + sourceEntry.fullname + " to " + targetEntry.fullname + " because it would conflict with an existing file in the target directory.");
              case "directory":
                  throw Error("unable to move directory from " + sourceEntry.fullname + " to " + targetEntry.fullname + " because it would conflict with an existing directory in the target directory.");
              case "null":
                  break;
          }
          var oldPath = path.join(sourceEntry.dirname, sourceEntry.basename);
          var newPath = path.join(targetEntry.dirname, targetEntry.basename, sourceEntry.basename);
          log("moving: " + oldPath + " to " + newPath);
          fs.renameSync(oldPath, newPath);
      }
      exports.move = move;
  });
  define("system/folder/index", ["require", "exports", "system/folder/scan", "system/folder/create", "system/folder/copy", "system/folder/merge", "system/folder/drop", "system/folder/rename", "system/folder/move"], function (require, exports, scan_8, create_16, copy_3, merge_1, drop_1, rename_1, move_1) {
      "use strict";
      exports.scan_entry = scan_8.scan_entry;
      exports.scan_entries = scan_8.scan_entries;
      exports.scan_entries_recurisve = scan_8.scan_entries_recurisve;
      exports.create = create_16.create;
      exports.copy = copy_3.copy;
      exports.merge = merge_1.merge;
      exports.drop = drop_1.drop;
      exports.rename = rename_1.rename;
      exports.move = move_1.move;
  });
  define("system/file/append", ["require", "exports", "system/folder/scan", "path", "fs"], function (require, exports, scan_9, path, fs) {
      "use strict";
      function append(target, content, log) {
          if (content === void 0) { content = ""; }
          if (log === void 0) { log = function () { }; }
          var targetEntry = scan_9.scan_entry(path.resolve(target));
          switch (targetEntry.type) {
              case "directory":
                  throw Error("unable to append " + targetEntry.fullname + " because it is a directory.");
              case "file":
                  log("appending: " + targetEntry.fullname);
                  fs.appendFileSync(targetEntry.fullname, content, { encoding: "utf8" });
                  break;
              case "null":
                  log("writing: " + targetEntry.fullname);
                  fs.writeFile(targetEntry.fullname, content, { encoding: "utf8" });
                  break;
          }
      }
      exports.append = append;
  });
  define("system/file/read", ["require", "exports", "system/folder/scan", "path", "fs"], function (require, exports, scan_10, path, fs) {
      "use strict";
      function read(target, encoding, log) {
          if (encoding === void 0) { encoding = "utf8"; }
          if (log === void 0) { log = function () { }; }
          var targetEntry = scan_10.scan_entry(path.resolve(target));
          switch (targetEntry.type) {
              case "directory":
                  throw new Error("cannot read " + targetEntry.fullname + " because it is a directory.");
              case "null":
                  throw new Error("cannot read " + targetEntry.fullname + " because it does not exist.");
              case "file":
                  log("reading: " + targetEntry.fullname);
                  return fs.readFileSync(targetEntry.fullname, encoding);
          }
      }
      exports.read = read;
  });
  define("system/file/concat", ["require", "exports", "system/folder/scan", "system/file/read", "path", "fs"], function (require, exports, scan_11, read_1, path, fs) {
      "use strict";
      function concat(target, sources, seperator, log) {
          if (seperator === void 0) { seperator = ""; }
          if (log === void 0) { log = function () { }; }
          var targetEntry = scan_11.scan_entry(path.resolve(target));
          var sourceEntries = sources.map(function (source) { return scan_11.scan_entry(path.resolve(source)); });
          switch (targetEntry.type) {
              case "directory":
                  throw Error("cannot concat because the target " + targetEntry.fullname + " is a directory.");
              case "file":
                  break;
              case "null":
                  break;
          }
          sourceEntries.forEach(function (sourceEntry) {
              switch (sourceEntry.type) {
                  case "directory":
                      throw Error("cannot concat because the source " + targetEntry.fullname + " is a directory.");
                  case "null":
                      throw Error("cannot concat because the source " + targetEntry.fullname + " does not exist.");
                  case "file":
                      break;
              }
          });
          var content = sourceEntries.map(function (sourceEntry) {
              return read_1.read(sourceEntry.fullname, "utf8", log);
          })
              .join(seperator);
          log("writing: " + targetEntry.fullname);
          fs.writeFile(targetEntry.fullname, content, { encoding: "utf8" });
      }
      exports.concat = concat;
  });
  define("system/file/create", ["require", "exports", "system/folder/scan", "path", "fs"], function (require, exports, scan_12, path, fs) {
      "use strict";
      function create(target, content, log) {
          if (content === void 0) { content = ""; }
          if (log === void 0) { log = function () { }; }
          var targetEntry = scan_12.scan_entry(path.resolve(target));
          switch (targetEntry.type) {
              case "directory":
                  throw Error("unable to create " + targetEntry.fullname + " because a directory at the target location.");
              case "file":
                  log("skipping: " + targetEntry.fullname);
                  break;
              case "null":
                  log("writing: " + targetEntry.fullname);
                  fs.writeFile(targetEntry.fullname, content, { encoding: "utf8" });
                  break;
          }
      }
      exports.create = create;
  });
  define("system/file/drop", ["require", "exports", "system/folder/scan", "path", "fs"], function (require, exports, scan_13, path, fs) {
      "use strict";
      function drop(target, log) {
          if (log === void 0) { log = function () { }; }
          var targetEntry = scan_13.scan_entry(path.resolve(target));
          switch (targetEntry.type) {
              case "directory":
                  break;
              case "null":
                  break;
              case "file":
                  log("dropping: " + targetEntry.fullname);
                  fs.unlinkSync(targetEntry.fullname);
          }
      }
      exports.drop = drop;
  });
  define("system/file/move", ["require", "exports", "system/folder/scan", "path", "fs"], function (require, exports, scan_14, path, fs) {
      "use strict";
      function move(target, directory, log) {
          if (log === void 0) { log = function () { }; }
          var targetEntry = scan_14.scan_entry(path.resolve(target));
          var directoryEntry = scan_14.scan_entry(path.resolve(directory));
          var moveEntry = scan_14.scan_entry(path.resolve(path.join(directoryEntry.fullname, targetEntry.basename)));
          switch (targetEntry.type) {
              case "directory":
                  throw Error("unable to move file " + targetEntry.fullname + " because it is a directory.");
              case "null":
                  throw Error("unable to move file " + targetEntry.fullname + " because it does not exist.");
              case "file":
                  break;
          }
          switch (directoryEntry.type) {
              case "null":
                  throw Error("unable to move file " + targetEntry.fullname + " into " + directoryEntry.type + " because it does not exist.");
              case "file":
                  throw Error("unable to move file " + targetEntry.fullname + " into " + directoryEntry.type + " because it is a file.");
              case "directory":
                  break;
          }
          switch (moveEntry.type) {
              case "directory":
                  throw Error("unable to move file " + targetEntry.fullname + " into " + directoryEntry.type + " because a directory of this name already exists in the target directory.");
              case "file":
                  throw Error("unable to move file " + targetEntry.fullname + " into " + directoryEntry.type + " because a file of this name already exists in the target directory.");
              case "null":
                  break;
          }
          log("moving: " + targetEntry.fullname + " to " + moveEntry.fullname);
          fs.renameSync(targetEntry.fullname, moveEntry.fullname);
      }
      exports.move = move;
  });
  define("system/file/rename", ["require", "exports", "system/folder/scan", "path", "fs"], function (require, exports, scan_15, path, fs) {
      "use strict";
      function rename(target, newname, log) {
          if (log === void 0) { log = function () { }; }
          if (newname.indexOf("/") !== -1 || newname.indexOf("\\") !== -1) {
              throw Error("file newname argument cannot be a path.");
          }
          var targetEntry = scan_15.scan_entry(path.resolve(target));
          var renameEntry = scan_15.scan_entry(path.resolve(path.join(targetEntry.dirname, newname)));
          switch (targetEntry.type) {
              case "directory":
                  throw Error("unable to rename file " + targetEntry.fullname + " because it is a directory.");
              case "null":
                  throw Error("unable to rename file " + targetEntry.fullname + " because it doesn't exist.");
              case "file":
                  break;
          }
          switch (renameEntry.type) {
              case "directory":
                  throw Error("unable to rename file " + targetEntry.fullname + " to " + renameEntry.fullname + " because a directory already exists of this name.");
              case "file":
                  throw Error("unable to rename file " + targetEntry.fullname + " to " + renameEntry.fullname + " because a file already exists of this name.");
              case "null":
                  break;
          }
          log("renaming: " + targetEntry.fullname + " to " + renameEntry.fullname);
          fs.renameSync(targetEntry.fullname, renameEntry.fullname);
      }
      exports.rename = rename;
  });
  define("system/file/replaceText", ["require", "exports", "system/folder/scan", "system/file/read", "path", "fs"], function (require, exports, scan_16, read_2, path, fs) {
      "use strict";
      function replaceText(target, token, replacement, log) {
          if (log === void 0) { log = function () { }; }
          var targetEntry = scan_16.scan_entry(path.resolve(target));
          switch (targetEntry.type) {
              case "directory":
                  throw new Error("cannot replaceText in " + targetEntry.fullname + " because it is a directory.");
              case "null":
                  throw new Error("cannot replaceText in " + targetEntry.fullname + " because it does not exist.");
              case "file":
                  var content = read_2.read(targetEntry.fullname, "utf8", log);
                  log("replace: \"" + token + "\" with \"" + replacement + "\"");
                  content = content.split(token).join(replacement);
                  log("writing: " + targetEntry.fullname);
                  fs.writeFileSync(targetEntry.fullname, content, { encoding: "utf8" });
                  break;
          }
      }
      exports.replaceText = replaceText;
  });
  define("system/file/truncate", ["require", "exports", "system/folder/scan", "path", "fs"], function (require, exports, scan_17, path, fs) {
      "use strict";
      function truncate(target, content, log) {
          if (content === void 0) { content = ""; }
          if (log === void 0) { log = function () { }; }
          var targetEntry = scan_17.scan_entry(path.resolve(target));
          switch (targetEntry.type) {
              case "directory":
                  throw Error("unable to truncate " + targetEntry.fullname + " because it is a directory.");
              case "file":
                  log("truncating: " + targetEntry.fullname);
                  fs.writeFile(targetEntry.fullname, content, { encoding: "utf8" });
                  break;
              case "null":
                  log("writing: " + targetEntry.fullname);
                  fs.writeFile(targetEntry.fullname, content, { encoding: "utf8" });
                  break;
          }
      }
      exports.truncate = truncate;
  });
  define("system/file/index", ["require", "exports", "system/file/append", "system/file/concat", "system/file/copy", "system/file/create", "system/file/drop", "system/file/move", "system/file/read", "system/file/rename", "system/file/replaceText", "system/file/truncate"], function (require, exports, append_1, concat_1, copy_4, create_17, drop_2, move_2, read_3, rename_2, replaceText_1, truncate_1) {
      "use strict";
      exports.append = append_1.append;
      exports.concat = concat_1.concat;
      exports.copy = copy_4.copy;
      exports.copyTo = copy_4.copyTo;
      exports.create = create_17.create;
      exports.drop = drop_2.drop;
      exports.move = move_2.move;
      exports.read = read_3.read;
      exports.rename = rename_2.rename;
      exports.replaceText = replaceText_1.replaceText;
      exports.truncate = truncate_1.truncate;
  });
  define("system/http/get", ["require", "exports", "http", "https", "url"], function (require, exports, http, https, url) {
      "use strict";
      function get(endpoint) {
          var request = function (proto, uri) { return new Promise(function (resolve, reject) {
              proto.get(uri, function (response) {
                  if (response.statusCode !== 200) {
                      reject(new Error("statusCode " + response.statusCode));
                      return;
                  }
                  var buffer = [];
                  response.setEncoding("utf8");
                  response.on("data", function (data) { return buffer.push(data); });
                  response.on("error", function (error) { return reject(error); });
                  response.on("end", function () {
                      resolve(buffer.join(''));
                  });
              }).on("error", function (error) { return reject(error); });
          }); };
          switch (url.parse(endpoint).protocol) {
              case "http:": return request(http, endpoint);
              case "https:": return request(https, endpoint);
              default: Promise.reject("unknown protocol");
          }
      }
      exports.get = get;
  });
  define("system/http/index", ["require", "exports", "system/http/get"], function (require, exports, get_1) {
      "use strict";
      exports.get = get_1.get;
  });
  define("system/shell/index", ["require", "exports", "system/shell/process"], function (require, exports, process_2) {
      "use strict";
      exports.Process = process_2.Process;
  });
  define("system/index", ["require", "exports", "system/folder/index", "system/file/index", "system/http/index", "system/shell/index"], function (require, exports, folder, file, http, shell) {
      "use strict";
      exports.folder = folder;
      exports.file = file;
      exports.http = http;
      exports.shell = shell;
  });
  define("folder/copy", ["require", "exports", "system/folder/copy", "common/signature", "core/create"], function (require, exports, copy_5, signature_14, create_18) {
      "use strict";
      function copy() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_18.create("folder/copy", function (context) { return signature_14.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["string", "string"])
              .run(function (source, target) {
              try {
                  copy_5.copy(source, target, function (data) { return context.log(data); });
                  context.ok();
              }
              catch (error) {
                  context.fail(error);
              }
          }); });
      }
      exports.copy = copy;
  });
  define("folder/create", ["require", "exports", "system/folder/create", "common/signature", "core/create"], function (require, exports, create_19, signature_15, create_20) {
      "use strict";
      function create() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_20.create("folder/create", function (context) { return signature_15.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["string"])
              .run(function (target) {
              try {
                  create_19.create(target, function (data) { return context.log(data); });
                  context.ok();
              }
              catch (error) {
                  context.fail(error);
              }
          }); });
      }
      exports.create = create;
  });
  define("folder/drop", ["require", "exports", "system/folder/drop", "common/signature", "core/create"], function (require, exports, drop_3, signature_16, create_21) {
      "use strict";
      function drop() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_21.create("folder/drop", function (context) { return signature_16.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["string"])
              .run(function (target) {
              try {
                  drop_3.drop(target, function (data) { return context.log(data); });
                  context.ok();
              }
              catch (error) {
                  context.fail(error);
              }
          }); });
      }
      exports.drop = drop;
  });
  define("folder/merge", ["require", "exports", "system/folder/merge", "common/signature", "core/create"], function (require, exports, merge_2, signature_17, create_22) {
      "use strict";
      function merge() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_22.create("folder/merge", function (context) { return signature_17.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["string", "string"])
              .run(function (source, target) {
              try {
                  merge_2.merge(source, target, function (data) { return context.log(data); });
                  context.ok();
              }
              catch (error) {
                  context.fail(error);
              }
          }); });
      }
      exports.merge = merge;
  });
  define("folder/move", ["require", "exports", "system/folder/move", "common/signature", "core/create"], function (require, exports, move_3, signature_18, create_23) {
      "use strict";
      function move() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_23.create("folder/move", function (context) { return signature_18.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["string", "string"])
              .run(function (source, target) {
              try {
                  move_3.move(source, target, function (data) { return context.log(data); });
                  context.ok();
              }
              catch (error) {
                  context.fail(error);
              }
          }); });
      }
      exports.move = move;
  });
  define("folder/rename", ["require", "exports", "system/folder/rename", "common/signature", "core/create"], function (require, exports, rename_3, signature_19, create_24) {
      "use strict";
      function rename() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_24.create("folder/rename", function (context) { return signature_19.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["string", "string"])
              .run(function (target, newname) {
              try {
                  rename_3.rename(target, newname, function (data) { return context.log(data); });
                  context.ok();
              }
              catch (error) {
                  context.fail(error);
              }
          }); });
      }
      exports.rename = rename;
  });
  define("folder/index", ["require", "exports", "folder/copy", "folder/create", "folder/drop", "folder/merge", "folder/move", "folder/rename"], function (require, exports, copy_6, create_25, drop_4, merge_3, move_4, rename_4) {
      "use strict";
      exports.copy = copy_6.copy;
      exports.create = create_25.create;
      exports.drop = drop_4.drop;
      exports.merge = merge_3.merge;
      exports.move = move_4.move;
      exports.rename = rename_4.rename;
  });
  define("file/append", ["require", "exports", "system/file/append", "common/signature", "core/create"], function (require, exports, append_2, signature_20, create_26) {
      "use strict";
      function append() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_26.create("file/append", function (context) { return signature_20.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["string", "string"])
              .run(function (target, content) {
              try {
                  append_2.append(target, content, function (data) { return context.log(data); });
                  context.ok();
              }
              catch (error) {
                  context.fail(error);
              }
          }); });
      }
      exports.append = append;
  });
  define("file/concat", ["require", "exports", "system/file/concat", "common/signature", "core/create"], function (require, exports, concat_2, signature_21, create_27) {
      "use strict";
      function concat() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_27.create("file/concat", function (context) { return signature_21.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["string", "array", "string"])
              .map(["string", "array"], function (target, sources) { return [target, sources, ""]; })
              .run(function (target, sources, seperator) {
              try {
                  concat_2.concat(target, sources, seperator, function (data) { return context.log(data); });
                  context.ok();
              }
              catch (error) {
                  context.fail(error);
              }
          }); });
      }
      exports.concat = concat;
  });
  define("file/copy", ["require", "exports", "system/file/copy", "common/signature", "core/create"], function (require, exports, copy_7, signature_22, create_28) {
      "use strict";
      function copy() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_28.create("file/copy", function (context) { return signature_22.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["string", "string"])
              .run(function (source, target) {
              try {
                  copy_7.copyTo(source, target, function (data) { return context.log(data); });
                  context.ok();
              }
              catch (error) {
                  context.fail(error);
              }
          }); });
      }
      exports.copy = copy;
  });
  define("file/create", ["require", "exports", "system/file/create", "common/signature", "core/create"], function (require, exports, create_29, signature_23, create_30) {
      "use strict";
      function create() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_30.create("file/create", function (context) { return signature_23.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["string", "string"])
              .map(["string"], function (target) { return [target, ""]; })
              .run(function (target, content) {
              try {
                  create_29.create(target, content, function (data) { return context.log(data); });
                  context.ok();
              }
              catch (error) {
                  context.fail(error);
              }
          }); });
      }
      exports.create = create;
  });
  define("file/drop", ["require", "exports", "system/file/drop", "common/signature", "core/create"], function (require, exports, drop_5, signature_24, create_31) {
      "use strict";
      function drop() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_31.create("file/drop", function (context) { return signature_24.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["string"])
              .run(function (target) {
              try {
                  drop_5.drop(target, function (data) { return context.log(data); });
                  context.ok();
              }
              catch (error) {
                  context.fail(error);
              }
          }); });
      }
      exports.drop = drop;
  });
  define("file/move", ["require", "exports", "system/file/move", "common/signature", "core/create"], function (require, exports, move_5, signature_25, create_32) {
      "use strict";
      function move() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_32.create("file/move", function (context) { return signature_25.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["string", "string"])
              .run(function (target, directory) {
              try {
                  move_5.move(target, directory, function (data) { return context.log(data); });
                  context.ok();
              }
              catch (error) {
                  context.fail(error);
              }
          }); });
      }
      exports.move = move;
  });
  define("file/read", ["require", "exports", "system/file/read", "common/signature", "core/create", "core/noop"], function (require, exports, read_4, signature_26, create_33, noop_7) {
      "use strict";
      function read() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_33.create("file/read", function (context) { return signature_26.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["string", "function"])
              .run(function (target, func) {
              var content = "";
              var task = noop_7.noop();
              try {
                  content = read_4.read(target, "utf8", function (data) { return context.log(data); });
              }
              catch (error) {
                  context.fail(error);
                  return;
              }
              task = func(content);
              task.run(function (data) { return context.log(data); })
                  .then(function () { return context.ok(); })
                  .catch(function (error) { return context.fail(error); });
              context.abort(function () {
                  task.cancel();
                  context.fail("aborted");
              });
          }); });
      }
      exports.read = read;
  });
  define("file/rename", ["require", "exports", "system/file/rename", "common/signature", "core/create"], function (require, exports, rename_5, signature_27, create_34) {
      "use strict";
      function rename() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_34.create("file/rename", function (context) { return signature_27.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["string", "string"])
              .run(function (target, newname) {
              try {
                  rename_5.rename(target, newname, function (data) { return context.log(data); });
                  context.ok();
              }
              catch (error) {
                  context.fail(error);
              }
          }); });
      }
      exports.rename = rename;
  });
  define("file/replaceText", ["require", "exports", "system/file/replaceText", "common/signature", "core/create"], function (require, exports, replaceText_2, signature_28, create_35) {
      "use strict";
      function replaceText() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_35.create("file/replaceText", function (context) { return signature_28.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["string", "string", "string"])
              .run(function (target, token, replacement) {
              try {
                  replaceText_2.replaceText(target, token, replacement, function (data) { return context.log(data); });
                  context.ok();
              }
              catch (error) {
                  context.fail(error);
              }
          }); });
      }
      exports.replaceText = replaceText;
  });
  define("file/truncate", ["require", "exports", "system/file/truncate", "common/signature", "core/create"], function (require, exports, truncate_2, signature_29, create_36) {
      "use strict";
      function truncate() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_36.create("file/truncate", function (context) { return signature_29.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["string", "string"])
              .map(["string"], function (target) { return [target, ""]; })
              .run(function (target, content) {
              try {
                  truncate_2.truncate(target, content, function (data) { return context.log(data); });
                  context.ok();
              }
              catch (error) {
                  context.fail(error);
              }
          }); });
      }
      exports.truncate = truncate;
  });
  define("file/index", ["require", "exports", "file/append", "file/concat", "file/copy", "file/create", "file/drop", "file/move", "file/read", "file/rename", "file/replaceText", "file/truncate"], function (require, exports, append_3, concat_3, copy_8, create_37, drop_6, move_6, read_5, rename_6, replaceText_3, truncate_3) {
      "use strict";
      exports.append = append_3.append;
      exports.concat = concat_3.concat;
      exports.copy = copy_8.copy;
      exports.create = create_37.create;
      exports.drop = drop_6.drop;
      exports.move = move_6.move;
      exports.read = read_5.read;
      exports.rename = rename_6.rename;
      exports.replaceText = replaceText_3.replaceText;
      exports.truncate = truncate_3.truncate;
  });
  define("http/get", ["require", "exports", "system/http/get", "common/signature", "core/create", "core/noop"], function (require, exports, get_2, signature_30, create_38, noop_8) {
      "use strict";
      function get() {
          var args = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              args[_i] = arguments[_i];
          }
          return create_38.create("http/get", function (context) { return signature_30.signature(args)
              .err(function (err) { return context.fail(err); })
              .map(["string", "function"])
              .run(function (endpoint, func) {
              var cancelled = false;
              var task = noop_8.noop();
              get_2.get(endpoint).then(function (content) {
                  if (cancelled)
                      return;
                  task = func(content);
                  task.run(function (data) { return context.log(data); })
                      .then(function () { return context.ok(); })
                      .catch(function (error) { return context.fail(error); });
              }).catch(function (error) { return context.log(error); });
              context.abort(function () {
                  cancelled = true;
                  task.cancel();
                  context.fail("abort");
              });
          }); });
      }
      exports.get = get;
  });
  define("http/index", ["require", "exports", "http/get"], function (require, exports, get_3) {
      "use strict";
      exports.get = get_3.get;
  });
  define("index", ["require", "exports", "core/task", "core/cli", "core/create", "core/debug", "core/fail", "core/delay", "core/each", "core/ifelse", "core/ok", "core/parallel", "core/repeat", "core/retry", "core/series", "core/shell", "core/timeout", "core/trycatch", "core/watch", "system/index", "folder/index", "file/index", "http/index"], function (require, exports, task_2, cli_1, create_39, debug_1, fail_1, delay_1, each_1, ifelse_1, ok_1, parallel_1, repeat_1, retry_1, series_1, shell_1, timeout_1, trycatch_1, watch_1, system, folder, file, http) {
      "use strict";
      exports.Task = task_2.Task;
      exports.cli = cli_1.cli;
      exports.create = create_39.create;
      exports.debug = debug_1.debug;
      exports.fail = fail_1.fail;
      exports.delay = delay_1.delay;
      exports.each = each_1.each;
      exports.ifelse = ifelse_1.ifelse;
      exports.ok = ok_1.ok;
      exports.parallel = parallel_1.parallel;
      exports.repeat = repeat_1.repeat;
      exports.retry = retry_1.retry;
      exports.series = series_1.series;
      exports.shell = shell_1.shell;
      exports.timeout = timeout_1.timeout;
      exports.trycatch = trycatch_1.trycatch;
      exports.watch = watch_1.watch;
      exports.system = system;
      exports.folder = folder;
      exports.file = file;
      exports.http = http;
  });
  
  return collect(); 
})();