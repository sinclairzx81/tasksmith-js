/*--------------------------------------------------------------------------

tasksmith - task automation library for node.

The MIT License (MIT)

Copyright (c) 2015-2016 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

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
var definitions = [];
var resolve = function (id, cache) {
    if (id === "exports")
        return {};
    if (cache[id] !== undefined)
        return cache[id];
    var definition = (definitions.some(function (definition) { return definition.id === id; }))
        ? definitions.filter(function (definition) { return definition.id === id; })[0]
        : ({ id: id, dependencies: [], factory: function () { return require(id); } });
    var dependencies = definition.dependencies.map(function (dependency) { return resolve(dependency, cache); });
    var exports = definition.factory.apply({}, dependencies);
    if (definition.dependencies.some(function (dependency) { return dependency === "exports"; }))
        exports = dependencies[definition.dependencies.indexOf("exports")];
    return cache[id] = exports;
};
var collect = function () { return resolve(definitions[definitions.length - 1].id, {
    "require": function (arg, callback) { return callback(require(arg)); }
}); };
var define = function (id, dependencies, factory) {
    return definitions.push({ id: id, dependencies: dependencies, factory: factory });
};

define("common/promise", ["require", "exports"], function (require, exports) {
    "use strict";
    var Promise = (function () {
        function Promise(executor) {
            var _this = this;
            this.executor = executor;
            this.value_callbacks = [];
            this.error_callbacks = [];
            this.state = "pending";
            this.value = null;
            this.error = null;
            try {
                this.executor(function (value) { return _this._resolve(value); }, function (error) { return _this._reject(error); });
            }
            catch (error) {
                this._reject(error);
            }
        }
        Promise.prototype.then = function (onfulfilled, onrejected) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                switch (_this.state) {
                    case "rejected":
                        if (onrejected !== undefined)
                            onrejected(_this.error);
                        reject(_this.error);
                        break;
                    case "fulfilled":
                        var result = onfulfilled(_this.value);
                        if (result instanceof Promise)
                            result.then(resolve).catch(reject);
                        else
                            resolve(result);
                        break;
                    case "pending":
                        _this.error_callbacks.push(function (error) {
                            if (onrejected !== undefined)
                                onrejected(error);
                            reject(error);
                        });
                        _this.value_callbacks.push(function (value) {
                            var result = onfulfilled(value);
                            if (result instanceof Promise)
                                result.then(resolve).catch(reject);
                            else
                                resolve(result);
                        });
                        break;
                }
            });
        };
        Promise.prototype.catch = function (onrejected) {
            var _this = this;
            return new Promise(function (resolve, reject) {
                switch (_this.state) {
                    case "fulfilled": break;
                    case "rejected":
                        var result = onrejected(_this.error);
                        if (result instanceof Promise)
                            result.then(resolve).catch(reject);
                        else
                            resolve(result);
                        break;
                    case "pending":
                        _this.error_callbacks.push(function (error) {
                            var result = onrejected(_this.error);
                            if (result instanceof Promise)
                                result.then(resolve).catch(reject);
                            else
                                resolve(result);
                        });
                        break;
                }
            });
        };
        Promise.all = function (thenables) {
            return new Promise(function (resolve, reject) {
                if (thenables.length === 0) {
                    resolve([]);
                }
                else {
                    var results = new Array(thenables.length);
                    var completed = 0;
                    thenables.forEach(function (thenable, index) {
                        return thenable.then(function (value) {
                            results[index] = value;
                            completed += 1;
                            if (completed === thenables.length)
                                resolve(results);
                        }).catch(reject);
                    });
                }
            });
        };
        Promise.race = function (thenables) {
            return new Promise(function (resolve, reject) {
                thenables.forEach(function (promise, index) {
                    promise.then(resolve).catch(reject);
                });
            });
        };
        Promise.resolve = function (value) {
            return new Promise(function (resolve, reject) {
                if (value instanceof Promise)
                    value.then(resolve).catch(reject);
                else
                    resolve(value);
            });
        };
        Promise.reject = function (reason) {
            return new Promise(function (_, reject) { return reject(reason); });
        };
        Promise.prototype._resolve = function (value) {
            if (this.state === "pending") {
                this.state = "fulfilled";
                this.value = value;
                this.error_callbacks = [];
                while (this.value_callbacks.length > 0)
                    this.value_callbacks.shift()(this.value);
            }
        };
        Promise.prototype._reject = function (reason) {
            if (this.state === "pending") {
                this.state = "rejected";
                this.error = reason;
                this.value_callbacks = [];
                while (this.error_callbacks.length > 0)
                    this.error_callbacks.shift()(this.error);
            }
        };
        return Promise;
    }());
    exports.Promise = Promise;
});
define("core/task", ["require", "exports", "common/promise"], function (require, exports, promise_1) {
    "use strict";
    var format_arguments = function (args) {
        if (args === null || args === undefined)
            return "";
        if (Array.isArray(args) === false)
            return "";
        var buffer = [];
        for (var i = 0; i < args.length; i++) {
            if (args[i] === null || args[i] === undefined)
                continue;
            var str = args[i].toString();
            if (str.length === 0)
                continue;
            buffer.push(str);
        }
        return (buffer.length === 1)
            ? buffer[0]
            : buffer.join(' ');
    };
    var TaskCancellation = (function () {
        function TaskCancellation() {
            this.state = "active";
            this.subscribers = [];
        }
        TaskCancellation.prototype.subscribe = function (func) {
            this.subscribers.push(func);
        };
        TaskCancellation.prototype.cancel = function (reason) {
            if (this.state === "cancelled")
                throw Error("cannot cancel a task more than once.");
            this.subscribers.forEach(function (subscriber) { return subscriber(reason); });
            this.state = "cancelled";
            this.subscribers = [];
        };
        return TaskCancellation;
    }());
    exports.TaskCancellation = TaskCancellation;
    var Task = (function () {
        function Task(name, task_executor, task_cancellor) {
            this.subscribers = [];
            this.state = "pending";
            this.executor = task_executor;
            this.cancellor = task_cancellor || new TaskCancellation();
            this.name = name;
            this.id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
        Task.prototype.run = function () {
            var _this = this;
            if (this.state !== "pending")
                throw Error("cannot run a task more than once.");
            return new promise_1.Promise(function (resolve, reject) {
                _this.state = "started";
                _this._notify({
                    id: _this.id,
                    name: _this.name,
                    time: new Date(),
                    type: "started",
                    data: ""
                });
                _this.executor({
                    emit: function (event) {
                        if (_this.state === "started") {
                            _this._notify(event);
                        }
                    },
                    log: function () {
                        var args = [];
                        for (var _i = 0; _i < arguments.length; _i++) {
                            args[_i - 0] = arguments[_i];
                        }
                        if (_this.state === "started") {
                            var data = format_arguments(args);
                            _this._notify({
                                id: _this.id,
                                name: _this.name,
                                time: new Date(),
                                type: "log",
                                data: data
                            });
                        }
                    },
                    ok: function () {
                        var args = [];
                        for (var _i = 0; _i < arguments.length; _i++) {
                            args[_i - 0] = arguments[_i];
                        }
                        if (_this.state === "started") {
                            _this.state = "completed";
                            var data = format_arguments(args);
                            _this._notify({
                                id: _this.id,
                                name: _this.name,
                                time: new Date(),
                                type: "completed",
                                data: data
                            });
                            resolve(format_arguments(args));
                        }
                    },
                    fail: function () {
                        var args = [];
                        for (var _i = 0; _i < arguments.length; _i++) {
                            args[_i - 0] = arguments[_i];
                        }
                        if (_this.state === "started") {
                            _this.state = "failed";
                            var data = format_arguments(args);
                            _this._notify({
                                id: _this.id,
                                name: _this.name,
                                time: new Date(),
                                type: "failed",
                                data: data
                            });
                            reject(format_arguments(args));
                        }
                    },
                    oncancel: function (func) {
                        if (_this.state === "started") {
                            _this.cancellor.subscribe(func);
                        }
                    }
                });
            });
        };
        Task.prototype.cancel = function (reason) {
            if (this.state === "started")
                this.cancellor.cancel(reason || "");
        };
        Task.prototype.subscribe = function (func) {
            if (this.state !== "pending")
                throw Error("can only subscribe to a task while in a pending state.");
            this.subscribers.push(func);
            return this;
        };
        Task.prototype._notify = function (event) {
            this.subscribers.forEach(function (subscriber) { return subscriber(event); });
        };
        return Task;
    }());
    exports.Task = Task;
});
define("common/tabulate", ["require", "exports"], function (require, exports) {
    "use strict";
    var pad = function (length) {
        var buf = "";
        for (var i = 0; i < length; i++)
            buf = buf.concat(" ");
        return buf;
    };
    var defaults = function (mapping) { return ({
        key: (mapping.key !== undefined) ? mapping.key : "",
        width: (mapping.width !== undefined) ? mapping.width : 8,
        pad: (mapping.pad !== undefined) ? mapping.pad : 0,
        wrap: (mapping.wrap !== undefined) ? mapping.wrap : false,
        map: (mapping.map !== undefined) ? mapping.map : function (value) {
            if (value === undefined)
                return "undefined";
            if (value === null)
                return "null";
            return value.toString();
        }
    }); };
    var map = function (obj, mapping) { return ({
        width: mapping.width,
        pad: mapping.pad,
        wrap: mapping.wrap,
        lines: (obj[mapping.key] === undefined && obj[mapping.key] === null)
            ? [""]
            : mapping.map(obj[mapping.key])
                .replace("\r", "")
                .replace("\t", "  ")
                .split("\n")
    }); };
    var truncate = function (cell) { return ({
        wrap: cell.wrap,
        width: cell.width,
        pad: cell.pad,
        lines: cell.lines.reduce(function (buf, line, index) {
            var copy = line.slice(0);
            var width = cell.width - cell.pad;
            copy = (copy.length >= width)
                ? copy.substring(0, width)
                : copy;
            var feed = "".concat(copy, pad(cell.width - copy.length));
            buf.push(feed);
            return buf;
        }, [])
    }); };
    var wrap = function (cell) { return ({
        wrap: cell.wrap,
        width: cell.width,
        pad: cell.pad,
        lines: cell.lines.reduce(function (buf, line) {
            var copy = line.slice(0);
            var padding = pad(cell.pad);
            var inner = cell.width - cell.pad;
            while (copy.length > inner) {
                var feed_1 = "".concat(copy.substring(0, inner), padding);
                copy = copy.substring(inner);
                buf.push(feed_1);
            }
            var feed = "".concat(copy, pad(cell.width - copy.length));
            buf.push(feed);
            return buf;
        }, [])
    }); };
    var project = function (cells) {
        var result = [];
        var empty = cells.map(function (cell) { return pad(cell.width); });
        var linecount = cells.reduce(function (acc, cell) { return (cell.lines.length > acc)
            ? cell.lines.length
            : acc; }, 0);
        for (var li = 0; li < linecount; li++) {
            for (var ci = 0; ci < cells.length; ci++) {
                (li < cells[ci].lines.length)
                    ? result.push(cells[ci].lines[li])
                    : result.push(empty[ci]);
            }
            if (li < linecount - 1)
                result.push("\n");
        }
        return result.join("");
    };
    exports.tabulate = function (mappings) {
        return function (obj) {
            return project(mappings.map(function (mapping) { return defaults(mapping); })
                .map(function (mapping) { return map(obj, mapping); })
                .map(function (cell) { return cell.wrap ? wrap(cell)
                : truncate(cell); }));
        };
    };
});
define("core/format", ["require", "exports", "common/tabulate"], function (require, exports, tabulate_1) {
    "use strict";
    var event_format = tabulate_1.tabulate([
        { key: "time", width: 10, pad: 1, map: function (time) { return time.toTimeString(); } },
        { key: "type", width: 10, pad: 1 },
        { key: "name", width: 16, pad: 1 },
        { key: "data", width: 80, wrap: true },
    ]);
    exports.format = function (event) { return event_format(event).trim(); };
});
define("core/debug", ["require", "exports", "core/format"], function (require, exports, format_1) {
    "use strict";
    exports.debug = function (task) { return task.subscribe(function (event) { return console.log(format_1.format(event)); }).run(); };
});
define("common/signature", ["require", "exports"], function (require, exports) {
    "use strict";
    var reflect = function (obj) {
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
        }
        return "object";
    };
    var match = function (args, mapping) {
        if (args.length !== mapping.pattern.length)
            return false;
        else
            return mapping.pattern.every(function (type, index) {
                return reflect(args[index]) === type;
            });
    };
    exports.signature = function (args, mappings) {
        var matches = mappings.filter(function (mapping) { return match(args, mapping); });
        if (matches.length === 1)
            return matches[0].map(args);
        else if (matches.length > 1)
            throw Error("signature: ambiguous arguments.");
        else
            throw Error("signature: no overload found for given arguments.");
    };
});
define("core/script", ["require", "exports", "common/signature", "core/task"], function (require, exports, signature_1, task_1) {
    "use strict";
    function script() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_1.signature(args, [
            { pattern: ["string", "function"], map: function (args) { return ({ task: args[0], func: args[1] }); } },
            { pattern: ["function"], map: function (args) { return ({ task: "core/script", func: args[0] }); } },
        ]);
        return new task_1.Task(param.task, param.func);
    }
    exports.script = script;
});
define("core/ok", ["require", "exports", "common/signature", "core/script"], function (require, exports, signature_2, script_1) {
    "use strict";
    function ok() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_2.signature(args, [
            { pattern: ["string"], map: function (args) { return ({ message: args[0] }); } },
            { pattern: [], map: function (args) { return ({ message: null }); } },
        ]);
        return script_1.script("core/ok", function (context) { return context.ok(param.message || ""); });
    }
    exports.ok = ok;
});
define("core/delay", ["require", "exports", "common/signature", "core/script", "core/ok"], function (require, exports, signature_3, script_2, ok_1) {
    "use strict";
    function delay() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_3.signature(args, [
            { pattern: ["number", "function"], map: function (args) { return ({ ms: args[0], taskfunc: args[1] }); } },
            { pattern: ["number"], map: function (args) { return ({ ms: args[0], taskfunc: function () { return ok_1.ok(); } }); } },
        ]);
        return script_2.script("core/delay", function (context) {
            var cancelled = false;
            var timeout = setTimeout(function () {
                if (cancelled === true)
                    return;
                var task = param.taskfunc();
                task.subscribe(function (event) { return context.emit(event); })
                    .run()
                    .then(function () { return context.ok(); })
                    .catch(function (error) { return context.fail(error); });
            }, param.ms);
            context.oncancel(function (reason) {
                cancelled = true;
                clearTimeout(timeout);
                context.fail(reason);
            });
        });
    }
    exports.delay = delay;
});
define("core/dowhile", ["require", "exports", "common/signature", "core/script"], function (require, exports, signature_4, script_3) {
    "use strict";
    function dowhile() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_4.signature(args, [
            { pattern: ["function", "function"], map: function (args) { return ({ condition: args[0], taskfunc: args[1] }); } },
        ]);
        return script_3.script("core/dowhile", function (context) {
            var task = null;
            var cancelled = false;
            context.oncancel(function (reason) {
                cancelled = true;
                if (task !== null)
                    task.cancel(reason);
                context.fail(reason);
            });
            var next = function () {
                if (cancelled === true)
                    return;
                task = param.taskfunc();
                task.subscribe(function (event) { return context.emit(event); })
                    .run()
                    .then(function () { return param.condition(function (result) { return (result) ? next() : context.ok(); }); })
                    .catch(function (error) { return context.fail(error); });
            };
            next();
        });
    }
    exports.dowhile = dowhile;
});
define("core/fail", ["require", "exports", "common/signature", "core/script"], function (require, exports, signature_5, script_4) {
    "use strict";
    function fail() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_5.signature(args, [
            { pattern: ["string"], map: function (args) { return ({ message: args[0] }); } },
            { pattern: [], map: function (args) { return ({ message: "" }); } },
        ]);
        return script_4.script("core/fail", function (context) { return context.fail(param.message); });
    }
    exports.fail = fail;
});
define("core/ifelse", ["require", "exports", "common/signature", "core/script"], function (require, exports, signature_6, script_5) {
    "use strict";
    function ifelse() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_6.signature(args, [
            { pattern: ["function", "function", "function"], map: function (args) { return ({ condition: args[0], left: args[1], right: args[2] }); } },
        ]);
        return script_5.script("core/ifelse", function (context) {
            var task = null;
            var cancelled = false;
            context.oncancel(function (reason) {
                cancelled = true;
                if (task !== null)
                    task.cancel(reason);
                context.fail(reason);
            });
            param.condition(function (result) {
                if (cancelled === true)
                    return;
                task = (result) ? param.left() : param.right();
                task.subscribe(function (event) { return context.emit(event); })
                    .run()
                    .then(function () { return context.ok(); })
                    .catch(function (error) { return context.fail(error); });
            });
        });
    }
    exports.ifelse = ifelse;
});
define("core/ifthen", ["require", "exports", "common/signature", "core/script"], function (require, exports, signature_7, script_6) {
    "use strict";
    function ifthen() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_7.signature(args, [
            { pattern: ["function", "function"], map: function (args) { return ({ condition: args[0], taskfunc: args[1] }); } },
        ]);
        return script_6.script("core/ifthen", function (context) {
            var task = null;
            var cancelled = false;
            context.oncancel(function (reason) {
                cancelled = true;
                if (task !== null)
                    task.cancel(reason);
                context.fail(reason);
            });
            param.condition(function (result) {
                if (cancelled === true)
                    return;
                if (result === false) {
                    context.ok();
                    return;
                }
                var task = param.taskfunc();
                task.subscribe(function (event) { return context.emit(event); })
                    .run()
                    .then(function () { return context.ok(); })
                    .catch(function (error) { return context.fail(error); });
            });
        });
    }
    exports.ifthen = ifthen;
});
define("core/parallel", ["require", "exports", "common/signature", "core/script"], function (require, exports, signature_8, script_7) {
    "use strict";
    function parallel() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_8.signature(args, [
            { pattern: ["array"], map: function (args) { return ({ tasks: args[0] }); } },
        ]);
        return script_7.script("core/parallel", function (context) {
            var completed = 0;
            var cancelled = false;
            context.oncancel(function (reason) {
                cancelled = true;
                param.tasks.forEach(function (task) { return task.cancel(reason); });
                context.fail(reason);
            });
            param.tasks.forEach(function (task) {
                task.subscribe(function (event) { return context.emit(event); })
                    .run()
                    .then(function () { completed += 1; if (completed === param.tasks.length) {
                    context.ok();
                } })
                    .catch(function (error) { return context.fail(error); });
            });
        });
    }
    exports.parallel = parallel;
});
define("core/repeat", ["require", "exports", "common/signature", "core/script"], function (require, exports, signature_9, script_8) {
    "use strict";
    function repeat() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_9.signature(args, [
            { pattern: ["number", "function"], map: function (args) { return ({ iterations: args[0], taskfunc: args[1] }); } },
        ]);
        return script_8.script("core/repeat", function (context) {
            var iteration = 0;
            var task = null;
            var cancelled = false;
            context.oncancel(function (reason) {
                cancelled = true;
                if (task !== null)
                    task.cancel(reason);
                context.fail(reason);
            });
            var next = function () {
                if (cancelled === true)
                    return;
                if (iteration === param.iterations) {
                    context.ok();
                    return;
                }
                iteration += 1;
                if (task !== null)
                    task.cancel();
                task = param.taskfunc(iteration);
                task.subscribe(function (event) { return context.emit(event); })
                    .run()
                    .then(function () { return next(); })
                    .catch(function (error) { return context.fail(error); });
            };
            next();
        });
    }
    exports.repeat = repeat;
});
define("core/retry", ["require", "exports", "common/signature", "core/script"], function (require, exports, signature_10, script_9) {
    "use strict";
    function retry() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_10.signature(args, [
            { pattern: ["number", "function"], map: function (args) { return ({ retries: args[0], taskfunc: args[1] }); } },
        ]);
        return script_9.script("core/retry", function (context) {
            var iteration = 0;
            var task = null;
            var cancelled = false;
            context.oncancel(function (reason) {
                cancelled = true;
                if (task !== null)
                    task.cancel(reason);
                context.fail(reason);
            });
            var next = function () {
                if (cancelled === true)
                    return;
                if (iteration === param.retries) {
                    context.fail();
                    return;
                }
                if (task !== null)
                    task.cancel();
                iteration += 1;
                task = param.taskfunc(iteration);
                task.subscribe(function (event) { return context.emit(event); })
                    .run()
                    .then(function () { return context.ok(); })
                    .catch(function (error) { return next(); });
            };
            next();
        });
    }
    exports.retry = retry;
});
define("core/series", ["require", "exports", "common/signature", "core/script"], function (require, exports, signature_11, script_10) {
    "use strict";
    function series() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_11.signature(args, [
            { pattern: ["array"], map: function (args) { return ({ tasks: args[0] }); } },
        ]);
        return script_10.script("core/series", function (context) {
            var task = null;
            var cancelled = false;
            context.oncancel(function (reason) {
                cancelled = true;
                if (task !== null)
                    task.cancel(reason);
                context.fail(reason);
            });
            var next = function () {
                if (cancelled === true)
                    return;
                if (param.tasks.length === 0) {
                    context.ok();
                    return;
                }
                task = param.tasks.shift();
                task.subscribe(function (event) { return context.emit(event); })
                    .run()
                    .then(next)
                    .catch(function (error) { return context.fail(error); });
            };
            next();
        });
    }
    exports.series = series;
});
define("core/timeout", ["require", "exports", "common/signature", "core/script"], function (require, exports, signature_12, script_11) {
    "use strict";
    function timeout() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_12.signature(args, [
            { pattern: ["number", "function"], map: function (args) { return ({ ms: args[0], taskfunc: args[1] }); } },
        ]);
        return script_11.script("core/timeout", function (context) {
            var task = param.taskfunc();
            var cancelled = false;
            var handle = setTimeout(function () { return task.cancel("timeout elaspsed."); }, param.ms);
            context.oncancel(function (reason) {
                cancelled = true;
                clearTimeout(handle);
                task.cancel(reason);
                context.fail(reason);
            });
            task.subscribe(function (event) { return context.emit(event); })
                .run()
                .then(function () { return context.ok(); })
                .catch(function (error) { return context.fail(error); });
        });
    }
    exports.timeout = timeout;
});
define("core/trycatch", ["require", "exports", "common/signature", "core/script"], function (require, exports, signature_13, script_12) {
    "use strict";
    function trycatch() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_13.signature(args, [
            { pattern: ["function", "function"], map: function (args) { return ({ left: args[0], right: args[1] }); } },
        ]);
        return script_12.script("core/trycatch", function (context) {
            var left = param.left();
            var right = null;
            var cancelled = false;
            context.oncancel(function (reason) {
                cancelled = true;
                if (left !== null)
                    left.cancel(reason);
                if (right !== null)
                    right.cancel(reason);
                context.fail(reason);
            });
            left.subscribe(function (event) { return context.emit(event); })
                .run()
                .then(function () { return context.ok(); })
                .catch(function () {
                if (cancelled === true)
                    return;
                var right = param.right();
                right.subscribe(function (event) { return context.emit(event); })
                    .run()
                    .then(function () { return context.ok(); })
                    .catch(function (error) { return context.fail(error); });
            });
        });
    }
    exports.trycatch = trycatch;
});
define("node/append", ["require", "exports", "common/signature", "core/script", "fs"], function (require, exports, signature_14, script_13, fs) {
    "use strict";
    function append() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_14.signature(args, [
            { pattern: ["string", "string"], map: function (args) { return ({ target: args[0], content: args[1] }); } },
        ]);
        return script_13.script("node/append", function (context) {
            try {
                var content = [fs.readFileSync(param.target, "utf8"), param.content].join("\n");
                fs.writeFileSync(param.target, content);
                context.ok();
            }
            catch (error) {
                context.fail(error.message);
            }
        });
    }
    exports.append = append;
});
define("node/cli", ["require", "exports", "core/script"], function (require, exports, script_14) {
    "use strict";
    exports.cli = function (argv, tasks) { return script_14.script("node/cli", function (context) {
        var args = process.argv.reduce(function (acc, c, index) {
            if (index > 1)
                acc.push(c);
            return acc;
        }, []);
        if (args.length !== 1 || tasks[args[0]] === undefined) {
            context.log("tasks:");
            Object.keys(tasks).forEach(function (key) { return context.log(" - ", key); });
            context.ok();
        }
        else {
            var task = tasks[args[0]];
            context.log("running: [" + args[0] + "]");
            task.subscribe(function (event) { return context.emit(event); })
                .run()
                .then(function (_) { return context.ok(); })
                .catch(function (error) { return context.fail(error); });
        }
    }); };
});
define("node/concat", ["require", "exports", "common/signature", "core/script", "fs"], function (require, exports, signature_15, script_15, fs) {
    "use strict";
    function concat() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_15.signature(args, [
            { pattern: ["string", "array"], map: function (args) { return ({ outputFile: args[0], sources: args[1] }); } },
        ]);
        return script_15.script("node/concat", function (context) {
            try {
                var content = param.sources.map(function (file) { return fs.readFileSync(file, "utf8"); }).join("\n");
                fs.writeFileSync(param.outputFile, content);
                context.ok();
            }
            catch (error) {
                context.fail(error.message);
            }
        });
    }
    exports.concat = concat;
});
define("node/fsutil", ["require", "exports", "path", "fs"], function (require, exports, path, fs) {
    "use strict";
    exports.message = function (context, args) {
        return " - " + [context, args.join(" ")].join(": ");
    };
    exports.error = function (context, message, path) {
        return new Error([context, message, path].join(": "));
    };
    exports.meta = function (src) {
        var exists = fs.existsSync(src);
        var stat = exists && fs.statSync(src);
        if (src === null || src === undefined) {
            return {
                type: "invalid",
                basename: path.basename(src),
                dirname: path.dirname(src),
                relname: path.normalize('./'),
                stat: null,
            };
        }
        else if (exists === true) {
            if (stat.isDirectory())
                return {
                    type: "directory",
                    basename: path.basename(src),
                    dirname: path.dirname(src),
                    relname: path.normalize('./'),
                    stat: stat
                };
            if (stat.isFile())
                return {
                    type: "file",
                    basename: path.basename(src),
                    dirname: path.dirname(src),
                    relname: path.normalize('./'),
                    stat: stat
                };
        }
        else {
            return {
                type: "empty",
                basename: path.basename(src),
                dirname: path.dirname(src),
                relname: path.normalize('./'),
                stat: null
            };
        }
    };
    exports.tree = function (src) {
        var src_info = exports.meta(src);
        switch (src_info.type) {
            case "invalid": throw exports.error("util: tree", "src path is invalid.", src);
            case "empty": throw exports.error("util: tree", "src exist doesn't exist.", src);
            case "directory": break;
            case "file": break;
        }
        var buffer = [];
        var seek = function (src, rel) {
            var info = exports.meta(src);
            switch (info.type) {
                case "invalid": break;
                case "empty": break;
                case "file":
                    info.relname = rel;
                    buffer.push(info);
                    break;
                case "directory":
                    buffer.push(info);
                    info.relname = path.join(rel, info.basename);
                    var dirname_1 = path.join(info.dirname, info.basename);
                    fs.readdirSync(dirname_1).forEach(function (basename) {
                        return seek(path.join(dirname_1, basename), info.relname);
                    });
                    break;
            }
        };
        seek(src, path.normalize("./"));
        return buffer;
    };
    exports.build_directory = function (directory) {
        var info = exports.meta(directory);
        switch (info.type) {
            case "directory": break;
            case "invalid": throw exports.error("util: build-directory", "directory path is invalid", directory);
            case "file": throw exports.error("util: build-directory", "directory path points to a file.", directory);
            case "empty":
                var parent_1 = path.dirname(directory);
                if (fs.existsSync(parent_1) === false)
                    exports.build_directory(parent_1);
                fs.mkdirSync(path.join(info.dirname, info.basename));
                break;
        }
    };
    exports.copy_file = function (src, dst) {
        var src_info = exports.meta(src);
        var dst_info = exports.meta(dst);
        switch (src_info.type) {
            case "empty": throw exports.error("util: copy-file", "src file path doesn't exist.", src);
            case "invalid": throw exports.error("util: copy-file", "src file path is invalid.", src);
            case "directory": throw exports.error("util: copy-file", "attempted to link a directory", src);
            case "file": break;
        }
        switch (dst_info.type) {
            case "directory": throw exports.error("util: copy-file", "dst file path found directory named the same.", dst);
            case "invalid": throw exports.error("util: copy-file", "dst file path is invalid.", dst);
            case "empty":
            case "file":
                exports.build_directory(dst_info.dirname);
                var source = path.join(src_info.dirname, src_info.basename);
                var target = path.join(dst_info.dirname, dst_info.basename);
                if (source !== target) {
                    if (dst_info.type === "file")
                        fs.unlinkSync(target);
                    fs.linkSync(source, target);
                }
                break;
        }
    };
});
define("node/copy", ["require", "exports", "common/signature", "core/script", "node/fsutil", "path"], function (require, exports, signature_16, script_16, fsutil, path) {
    "use strict";
    function copy() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_16.signature(args, [
            { pattern: ["string", "string"], map: function (args) { return ({ source_file_or_directory: args[0], target_directory: args[1] }); } },
        ]);
        return script_16.script("node/copy", function (context) {
            try {
                var src_1 = path.resolve(param.source_file_or_directory);
                var dst = path.resolve(param.target_directory);
                var dst_info_1 = fsutil.meta(dst);
                var gather = fsutil.tree(src_1);
                gather.forEach(function (src_info) {
                    switch (src_info.type) {
                        case "invalid": throw fsutil.error("copy", "invalid file or directory src path.", src_1);
                        case "empty": throw fsutil.error("copy", "no file or directory exists at the given src.", src_1);
                        case "directory":
                            var directory = path.join(dst_info_1.dirname, dst_info_1.basename, src_info.relname);
                            context.log(fsutil.message("mkdir", [directory]));
                            fsutil.build_directory(directory);
                            break;
                        case "file":
                            var source = path.join(src_info.dirname, src_info.basename);
                            var target = path.join(dst_info_1.dirname, dst_info_1.basename, src_info.relname, src_info.basename);
                            context.log(fsutil.message("copy", [source, target]));
                            fsutil.copy_file(source, target);
                            break;
                    }
                });
                context.ok();
            }
            catch (error) {
                context.fail(error.message);
            }
        });
    }
    exports.copy = copy;
});
define("node/drop", ["require", "exports", "common/signature", "core/script", "node/fsutil", "path", "fs"], function (require, exports, signature_17, script_17, fsutil, path, fs) {
    "use strict";
    function drop() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_17.signature(args, [
            { pattern: ["string"], map: function (args) { return ({ drop_file_or_directory: args[0] }); } },
        ]);
        return script_17.script("node/drop", function (context) {
            try {
                var src = path.resolve(param.drop_file_or_directory);
                var dst_info = fsutil.meta(src);
                var gather = fsutil.tree(src);
                gather.reverse();
                gather.forEach(function (src_info) {
                    switch (src_info.type) {
                        case "empty": break;
                        case "invalid": break;
                        case "directory":
                            var directory = path.join(src_info.dirname, src_info.basename);
                            context.log(fsutil.message("drop", [directory]));
                            fs.rmdirSync(directory);
                            break;
                        case "file":
                            var filename = path.join(src_info.dirname, src_info.basename);
                            context.log(fsutil.message("drop", [filename]));
                            fs.unlinkSync(filename);
                    }
                });
                context.ok();
            }
            catch (error) {
                context.fail(error.message);
            }
        });
    }
    exports.drop = drop;
});
define("node/serve", ["require", "exports", "common/signature", "core/script", "http", "fs", "path", "url"], function (require, exports, signature_18, script_18, http, fs, path, url) {
    "use strict";
    var signals_client_script = function () { return "\n<script type=\"text/javascript\">\n\nwindow.addEventListener(\"load\", function() {\n  //---------------------------------\n  // tasksmith: signals\n  //---------------------------------\n  function connect(handler) {\n    var xhr = new XMLHttpRequest();\n    var idx = 0;\n    xhr.addEventListener(\"readystatechange\", function(event) {\n      switch(xhr.readyState) {\n        case 4: handler(\"disconnect\"); break;\n        case 3:\n          var signal = xhr.response.substr(idx);\n          idx += signal.length;\n          handler(signal);\n          break;\n      }\n    });\n    xhr.open(\"GET\", \"/__signals\", true); \n    xhr.send();\n  }\n  function handler(signal) {\n    switch(signal) {\n      case \"established\": console.log(\"signals: established\");  break;\n      case \"reload\"     : window.location.reload(); break;\n      case \"ping\"       : break;    \n      case \"disconnect\":\n        console.log(\"signals: disconnected\");\n        setTimeout(function() {\n          console.log(\"signals: reconnecting...\");\n          connect(handler)\n        }, 1000) \n        break;\n    }\n  }\n  connect(handler)\n})\n</script>\n"; };
    var inject_signals_script = function (content) {
        var inject_index = content.length;
        var watch_prefix = content.slice(0, inject_index);
        var watch_content = signals_client_script();
        var watch_postfix = content.slice(inject_index);
        content = [
            watch_prefix,
            watch_content,
            watch_postfix
        ].join("");
        return content;
    };
    function serve() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_18.signature(args, [
            { pattern: ["string", "number", "boolean", "number"], map: function (args) { return ({ directory: args[0], port: args[1], watch: args[2], delay: args[3] }); } },
            { pattern: ["string", "number", "boolean"], map: function (args) { return ({ directory: args[0], port: args[1], watch: args[2], delay: 0 }); } },
            { pattern: ["string", "number"], map: function (args) { return ({ directory: args[0], port: args[1], watch: false, delay: 0 }); } }
        ]);
        return script_18.script("node/serve", function (context) {
            var clients = [];
            var listening = false;
            var cancelled = false;
            var waiting = true;
            var server = null;
            var watcher = null;
            if (param.watch === true) {
                watcher = fs.watch(param.directory, { recursive: true }, function (event, filename) {
                    if (cancelled === true)
                        return;
                    if (waiting === true) {
                        waiting = false;
                        setTimeout(function () {
                            clients.forEach(function (client) { return client("reload"); });
                            setTimeout(function () { return waiting = true; }, 100);
                        }, param.delay);
                    }
                });
            }
            server = http.createServer(function (request, response) {
                switch (request.url) {
                    case "/__signals":
                        {
                            context.log("SIG: client connected.");
                            response.setHeader('Connection', 'Transfer-Encoding');
                            response.setHeader('Content-Type', 'text/html; charset=utf-8');
                            response.setHeader('Transfer-Encoding', 'chunked');
                            response.write("established");
                            var client_1 = function (signal) {
                                context.log("SIG: " + signal);
                                response.write(signal);
                            };
                            clients.push(client_1);
                            var keep_alive_1 = setInterval(function () {
                                response.write("ping");
                            }, 15000);
                            var request_ = request;
                            request_.connection.on("end", function () {
                                clearInterval(keep_alive_1);
                                clients = clients.splice(clients.indexOf(client_1), 1);
                                context.log("SIG: client disconnected");
                            });
                        }
                        break;
                    default: {
                        var resolved = path.resolve("./", param.directory) + "\\";
                        var safeurl = request.url.replace(new RegExp("\\.\\.", 'g'), "");
                        var uri = url.parse(safeurl);
                        var resource_1 = path.join(resolved, uri.pathname);
                        resource_1 = resource_1.replace(new RegExp("\\\\", 'g'), "/");
                        if (resource_1.lastIndexOf("/") === (resource_1.length - 1))
                            resource_1 = resource_1 + "index.html";
                        resource_1 = path.normalize(resource_1);
                        var content_type = "application/octet-stream";
                        switch (path.extname(resource_1)) {
                            case ".js":
                                content_type = "text/javascript";
                                break;
                            case ".css":
                                content_type = "text/css";
                                break;
                            case ".json":
                                content_type = "application/json";
                                break;
                            case ".png":
                                content_type = "image/png";
                                break;
                            case ".jpeg":
                            case ".jpg":
                                content_type = "image/jpg";
                                break;
                            case ".wav":
                                content_type = "audio/wav";
                                break;
                            case ".mp4":
                                content_type = "video/mp4";
                                break;
                            case ".mp3":
                                content_type = "audio/mpeg";
                                break;
                            case ".htm":
                            case ".html":
                                content_type = "text/html";
                                break;
                        }
                        fs.stat(resource_1, function (err, stat) {
                            if (err) {
                                response.writeHead(404, { "Content-Type": "text/plain" });
                                response.end("404 - not found", "utf-8");
                                return;
                            }
                            if (stat.isDirectory()) {
                                response.writeHead(404, { "Content-Type": "text/plain" });
                                response.end("403 - forbidden", "utf-8");
                                return;
                            }
                            switch (content_type) {
                                case "text/html":
                                    context.log(request.method + ": " + request.url);
                                    fs.readFile(resource_1, "utf8", function (error, content) {
                                        content = (param.watch === true) ? inject_signals_script(content) : content;
                                        response.writeHead(200, { "Content-Type": content_type });
                                        response.end(content, "utf-8");
                                    });
                                    break;
                                default:
                                    context.log(request.method + ": " + request.url);
                                    var readstream = fs.createReadStream(resource_1);
                                    readstream.pipe(response);
                                    break;
                            }
                        });
                    }
                }
            }).listen(param.port, function (error) {
                if (error) {
                    context.fail(error.message);
                    return;
                }
                listening = true;
            });
            context.oncancel(function (reason) {
                cancelled = true;
                if (server !== null && listening === true)
                    server.close();
                if (watcher !== null && param.watch === true)
                    watcher.close();
                context.fail(reason);
            });
        });
    }
    exports.serve = serve;
});
define("node/shell", ["require", "exports", "common/signature", "core/script", "child_process", "child_process"], function (require, exports, signature_19, script_19, child_process_1, child_process_2) {
    "use strict";
    function shell() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_19.signature(args, [
            { pattern: ["string", "number"], map: function (args) { return ({ command: args[0], exitcode: args[1] }); } },
            { pattern: ["string"], map: function (args) { return ({ command: args[0], exitcode: 0 }); } },
        ]);
        return script_19.script("node/shell", function (context) {
            var windows = /^win/.test(process.platform);
            var child = child_process_1.spawn(windows ? 'cmd' : 'sh', [windows ? '/c' : '-c', param.command]);
            var cancelled = false;
            context.oncancel(function (reason) {
                cancelled = true;
                if (windows === true) {
                    child_process_2.exec('taskkill /pid ' + child.pid + ' /T /F', function (error) { });
                    context.fail(reason);
                }
                else {
                    child.stdout.removeAllListeners();
                    child.stderr.removeAllListeners();
                    child.stdout.pause();
                    child.stderr.pause();
                    child.stdin.end();
                    child.kill("SIGINT");
                    context.fail(reason);
                }
            });
            context.log(param.command);
            child.stdout.setEncoding("utf8");
            child.stdout.on("data", function (data) { return context.log(data); });
            child.stderr.on("data", function (data) { return context.log(data); });
            child.on("error", function (error) { return context.fail(error.toString); });
            child.on("close", function (code) {
                if (cancelled === true)
                    return;
                setTimeout(function () {
                    (param.exitcode !== code)
                        ? context.fail("shell: unexpected exit code. expected", param.exitcode, " got ", code)
                        : context.ok();
                }, 100);
            });
        });
    }
    exports.shell = shell;
});
define("node/watch", ["require", "exports", "common/signature", "core/script", "fs"], function (require, exports, signature_20, script_20, fs) {
    "use strict";
    function watch() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_20.signature(args, [
            { pattern: ["array", "number", "boolean", "function"], map: function (args) { return ({ paths: args[0], delay: args[1], immediate: args[2], taskfunc: args[3] }); } },
            { pattern: ["array", "number", "function"], map: function (args) { return ({ paths: args[0], delay: args[1], immediate: true, taskfunc: args[2] }); } },
            { pattern: ["array", "function"], map: function (args) { return ({ paths: args[0], delay: 1000, immediate: true, taskfunc: args[1] }); } },
            { pattern: ["string", "number", "boolean", "function"], map: function (args) { return ({ paths: [args[0]], delay: args[1], immediate: args[2], taskfunc: args[3] }); } },
            { pattern: ["string", "number", "function"], map: function (args) { return ({ paths: [args[0]], delay: args[1], immediate: true, taskfunc: args[2] }); } },
            { pattern: ["string", "function"], map: function (args) { return ({ paths: [args[0]], delay: 1000, immediate: true, taskfunc: args[1] }); } }
        ]);
        return script_20.script("node/watch", function (context) {
            var task = null;
            var watchers = null;
            var waiting = true;
            var completed = false;
            var cancelled = false;
            context.oncancel(function (reason) {
                cancelled = true;
                if (watchers !== null)
                    watchers.forEach(function (watcher) { return watcher.close(); });
                if (task !== null)
                    task.cancel(reason);
                context.fail(reason);
            });
            var next = function () {
                if (cancelled === true)
                    return;
                if (waiting === true) {
                    context.log("watch change detected.");
                    waiting = false;
                    setTimeout(function () { waiting = true; }, param.delay);
                    if (task !== null && completed === false) {
                        task.cancel("watch cancelled task.");
                    }
                    completed = false;
                    task = param.taskfunc();
                    task.subscribe(function (event) { return context.emit(event); })
                        .run()
                        .then(function () { completed = true; })
                        .catch(function () { completed = true; });
                }
            };
            if (param.immediate === true)
                next();
            watchers = param.paths.map(function (path) { return fs.watch(path, { recursive: true }, function (event, filename) { return next(); }); });
        });
    }
    exports.watch = watch;
});
define("tasksmith-node", ["require", "exports", "core/debug", "core/delay", "core/dowhile", "core/fail", "core/format", "core/ifelse", "core/ifthen", "core/ok", "core/parallel", "core/repeat", "core/retry", "core/script", "core/series", "core/task", "core/timeout", "core/trycatch", "node/append", "node/cli", "node/concat", "node/copy", "node/drop", "node/serve", "node/shell", "node/watch"], function (require, exports, debug_1, delay_1, dowhile_1, fail_1, format_2, ifelse_1, ifthen_1, ok_2, parallel_1, repeat_1, retry_1, script_21, series_1, task_2, timeout_1, trycatch_1, append_1, cli_1, concat_1, copy_1, drop_1, serve_1, shell_1, watch_1) {
    "use strict";
    exports.debug = debug_1.debug;
    exports.delay = delay_1.delay;
    exports.dowhile = dowhile_1.dowhile;
    exports.fail = fail_1.fail;
    exports.format = format_2.format;
    exports.ifelse = ifelse_1.ifelse;
    exports.ifthen = ifthen_1.ifthen;
    exports.ok = ok_2.ok;
    exports.parallel = parallel_1.parallel;
    exports.repeat = repeat_1.repeat;
    exports.retry = retry_1.retry;
    exports.script = script_21.script;
    exports.series = series_1.series;
    exports.Task = task_2.Task;
    exports.timeout = timeout_1.timeout;
    exports.trycatch = trycatch_1.trycatch;
    exports.append = append_1.append;
    exports.cli = cli_1.cli;
    exports.concat = concat_1.concat;
    exports.copy = copy_1.copy;
    exports.drop = drop_1.drop;
    exports.serve = serve_1.serve;
    exports.shell = shell_1.shell;
    exports.watch = watch_1.watch;
});

module.exports = collect();