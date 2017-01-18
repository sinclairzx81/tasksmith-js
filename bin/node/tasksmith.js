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

define("core/task", ["require", "exports"], function (require, exports) {
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
            return new Promise(function (resolve, reject) {
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
                            args[_i] = arguments[_i];
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
                            args[_i] = arguments[_i];
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
                            args[_i] = arguments[_i];
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
            args[_i] = arguments[_i];
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
            args[_i] = arguments[_i];
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
            args[_i] = arguments[_i];
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
            args[_i] = arguments[_i];
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
            args[_i] = arguments[_i];
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
            args[_i] = arguments[_i];
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
            args[_i] = arguments[_i];
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
            args[_i] = arguments[_i];
        }
        var param = signature_8.signature(args, [
            { pattern: ["function"], map: function (args) { return ({ func: args[0] }); } },
        ]);
        return script_7.script("core/parallel", function (context) {
            var completed = 0;
            var cancelled = false;
            var tasks = null;
            try {
                tasks = param.func();
            }
            catch (e) {
                context.fail(e);
                return;
            }
            context.oncancel(function (reason) {
                cancelled = true;
                tasks.forEach(function (task) { return task.cancel(reason); });
                context.fail(reason);
            });
            tasks.forEach(function (task) {
                task.subscribe(function (event) { return context.emit(event); })
                    .run()
                    .then(function () { completed += 1; if (completed === tasks.length) {
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
            args[_i] = arguments[_i];
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
            args[_i] = arguments[_i];
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
define("core/run", ["require", "exports"], function (require, exports) {
    "use strict";
    exports.run = function (task) { return task.subscribe(function (event) {
        if (event.data.trim().length > 0)
            console.log(event.data);
    }).run(); };
});
define("core/series", ["require", "exports", "common/signature", "core/script"], function (require, exports, signature_11, script_10) {
    "use strict";
    function series() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var param = signature_11.signature(args, [
            { pattern: ["function"], map: function (args) { return ({ func: args[0] }); } },
        ]);
        return script_10.script("core/series", function (context) {
            var task = null;
            var cancelled = false;
            var tasks = null;
            try {
                tasks = param.func();
            }
            catch (e) {
                context.fail(e);
                return;
            }
            context.oncancel(function (reason) {
                cancelled = true;
                if (task !== null)
                    task.cancel(reason);
                context.fail(reason);
            });
            var next = function () {
                if (cancelled === true)
                    return;
                if (tasks.length === 0) {
                    context.ok();
                    return;
                }
                task = tasks.shift();
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
            args[_i] = arguments[_i];
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
            args[_i] = arguments[_i];
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
define("node/util", ["require", "exports", "http", "https", "url", "path", "fs"], function (require, exports, http, https, url, path, fs) {
    "use strict";
    function error(context, message, path) {
        return new Error([context, message, path].join(": "));
    }
    exports.error = error;
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
                type: "not-found",
                basename: path.basename(src),
                dirname: path.dirname(src),
                relname: path.normalize('./'),
                stat: null
            };
        }
    };
    function tree(src) {
        var src_info = exports.meta(src);
        switch (src_info.type) {
            case "invalid": throw error("util: tree", "src path is invalid.", src);
            case "not-found": throw error("util: tree", "src exist doesn't exist.", src);
            case "directory": break;
            case "file": break;
        }
        var buffer = [];
        var seek = function (src, rel) {
            var info = exports.meta(src);
            switch (info.type) {
                case "invalid": break;
                case "not-found": break;
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
    }
    exports.tree = tree;
    function mkdir(directory, log) {
        log = log || function (message) { };
        var info = exports.meta(directory);
        switch (info.type) {
            case "directory": break;
            case "invalid": throw error("build-directory", "directory path is invalid", directory);
            case "file": throw error("build-directory", "directory path points to a file.", directory);
            case "not-found":
                var parent_1 = path.dirname(directory);
                if (fs.existsSync(parent_1) === false)
                    mkdir(parent_1, log);
                var target = path.join(info.dirname, info.basename);
                log(["mkdir", target].join(" "));
                fs.mkdirSync(target);
                break;
        }
    }
    exports.mkdir = mkdir;
    function touch(filepath, log) {
        log = log || function (message) { };
        mkdir(path.dirname(filepath), log);
        var info = exports.meta(filepath);
        switch (info.type) {
            case "directory": throw error("touch", "found directory at filepath", filepath);
            case "invalid": throw error("touch", "filepath is invalid", filepath);
            case "file": return;
            case "not-found":
                fs.openSync(filepath, 'a');
                break;
        }
    }
    exports.touch = touch;
    function copy_file(src, dst, log) {
        log = log || function (message) { };
        var meta_src = exports.meta(src);
        var meta_dst = exports.meta(dst);
        switch (meta_src.type) {
            case "invalid": throw error("copy-file", "src file path is invalid.", src);
            case "not-found": throw error("copy-file", "src file path doesn't exist.", src);
            case "directory": throw error("copy-file", "attempted to link a directory", src);
            case "file": break;
        }
        switch (meta_dst.type) {
            case "directory": throw error("copy-file", "dst file path found directory named the same.", dst);
            case "invalid": throw error("copy-file", "dst file path is invalid.", dst);
            case "not-found":
            case "file":
                mkdir(meta_dst.dirname, log);
                var source = path.join(meta_src.dirname, meta_src.basename);
                var target = path.join(meta_dst.dirname, meta_dst.basename);
                if (source !== target) {
                    if (meta_dst.type === "file") {
                        log(["unlink", target].join(" "));
                        fs.unlinkSync(target);
                    }
                    log(["copy", source, target].join(" "));
                    fs.linkSync(source, target);
                }
                break;
        }
    }
    exports.copy_file = copy_file;
    function copy(src, directory, log) {
        log = log || function (message) { };
        var meta_src = exports.meta(src);
        var meta_dst = exports.meta(directory);
        switch (meta_src.type) {
            case "invalid": throw error("copy", "the source file or directory path is invalid", src);
            case "not-found": throw error("copy", "the source file or directory path not found.", src);
        }
        switch (meta_dst.type) {
            case "invalid": throw error("copy", "the destination directory path is invalid", directory);
            case "file": throw error("copy", "the destination directory path points to a file", directory);
            case "not-found":
                mkdir(directory, log);
                break;
            case "directory": break;
        }
        var manifest = tree(src);
        manifest.forEach(function (meta_src) {
            switch (meta_src.type) {
                case "invalid": throw error("copy", "invalid file or directory path.", src);
                case "not-found": throw error("copy", "file or directory path not found.", src);
                case "directory":
                    var directory_1 = path.join(meta_dst.dirname, meta_dst.basename, meta_src.relname);
                    mkdir(directory_1, log);
                    break;
                case "file":
                    var source = path.join(meta_src.dirname, meta_src.basename);
                    var target = path.join(meta_dst.dirname, meta_dst.basename, meta_src.relname, meta_src.basename);
                    copy_file(source, target, log);
                    break;
            }
        });
    }
    exports.copy = copy;
    function drop(target, log) {
        log = log || function (message) { };
        var meta_dst = exports.meta(target);
        switch (meta_dst.type) {
            case "invalid": throw error("drop", "invalid file or directory path", target);
            case "not-found": return;
            case "file": break;
            case "directory": break;
        }
        var manifest = tree(target);
        manifest.reverse();
        manifest.forEach(function (src_info) {
            switch (src_info.type) {
                case "not-found": break;
                case "invalid": break;
                case "directory":
                    var directory = path.join(src_info.dirname, src_info.basename);
                    log(["rmdir", directory].join(" "));
                    fs.rmdirSync(directory);
                    break;
                case "file":
                    var filename = path.join(src_info.dirname, src_info.basename);
                    log(["unlink", filename].join(" "));
                    fs.unlinkSync(filename);
            }
        });
    }
    exports.drop = drop;
    function append(target, content, log) {
        log = log || function (message) { };
        var meta_dst = exports.meta(target);
        switch (meta_dst.type) {
            case "invalid": throw error("append", "the given path is invalid", target);
            case "directory": throw error("append", "the given path points to a directory", target);
            case "not-found":
                {
                    mkdir(meta_dst.dirname, log);
                    var filename = path.join(meta_dst.dirname, meta_dst.basename);
                    log(["write", filename].join(" "));
                    fs.writeFileSync(filename, content);
                }
                break;
            case "file":
                {
                    var filename = path.join(meta_dst.dirname, meta_dst.basename);
                    log(["append", filename].join(" "));
                    fs.appendFileSync(filename, content);
                }
                break;
        }
    }
    exports.append = append;
    function concat(target, sources, log) {
        log = log || function (message) { };
        var meta_dst = exports.meta(target);
        switch (meta_dst.type) {
            case "invalid": throw error("concat", "the given path is invalid", target);
            case "directory": throw error("concat", "the given path points to a directory", target);
            case "not-found": break;
            case "file": break;
        }
        mkdir(meta_dst.dirname, log);
        var content = sources
            .map(function (filename) { return path.resolve(filename); })
            .map(function (filename) { return fs.readFileSync(filename, "utf8"); })
            .join("\n");
        var filename = path.join(meta_dst.dirname, meta_dst.basename);
        log(["concat", filename].join(" "));
        fs.writeFileSync(filename, content);
    }
    exports.concat = concat;
    function download(uri, filepath, log) {
        log = log || function (message) { };
        var process = function (proto, uri, filepath) { return new Promise(function (resolve, reject) {
            proto.get(uri, function (response) {
                if (response.statusCode !== 200) {
                    reject(new Error("statusCode " + response.statusCode));
                    return;
                }
                var writestream = fs.createWriteStream(filepath);
                response.pipe(writestream)
                    .on("error", function (error) { return reject(error); })
                    .on("end", function () { return resolve(); });
            }).on("error", function (error) { return reject(error); });
        }); };
        mkdir(path.dirname(filepath), log);
        switch (url.parse(uri).protocol) {
            case "http:": return process(http, uri, filepath);
            case "https:": return process(https, uri, filepath);
            default: Promise.reject("unknown protocol");
        }
    }
    exports.download = download;
});
define("node/append", ["require", "exports", "common/signature", "core/script", "node/util", "path"], function (require, exports, signature_14, script_13, util, path) {
    "use strict";
    function append() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var param = signature_14.signature(args, [
            { pattern: ["string", "string"], map: function (args) { return ({ target: args[0], content: args[1] }); } },
        ]);
        return script_13.script("node/append", function (context) {
            try {
                var target = path.resolve(param.target);
                util.append(target, param.content, function (message) { return context.log(message); });
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
define("node/concat", ["require", "exports", "common/signature", "core/script", "node/util", "path"], function (require, exports, signature_15, script_15, util, path) {
    "use strict";
    function concat() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var param = signature_15.signature(args, [
            { pattern: ["string", "array"], map: function (args) { return ({ output: args[0], sources: args[1] }); } },
        ]);
        return script_15.script("node/concat", function (context) {
            try {
                var output = path.resolve(param.output);
                var sources = param.sources.map(function (source) { return path.resolve(source); });
                util.concat(output, sources, function (message) { return context.log(message); });
                context.ok();
            }
            catch (error) {
                context.fail(error.message);
            }
        });
    }
    exports.concat = concat;
});
define("node/copy", ["require", "exports", "common/signature", "core/script", "node/util", "path"], function (require, exports, signature_16, script_16, util, path) {
    "use strict";
    function copy() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var param = signature_16.signature(args, [
            { pattern: ["string", "string"], map: function (args) { return ({ source: args[0], target: args[1] }); } },
        ]);
        return script_16.script("node/copy", function (context) {
            try {
                var source = path.resolve(param.source);
                var target = path.resolve(param.target);
                util.copy(source, target, function (message) { return context.log(message); });
                context.ok();
            }
            catch (error) {
                context.fail(error.message);
            }
        });
    }
    exports.copy = copy;
});
define("node/download", ["require", "exports", "common/signature", "core/script", "node/util", "path"], function (require, exports, signature_17, script_17, util, path) {
    "use strict";
    function download() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var param = signature_17.signature(args, [
            { pattern: ["string", "string"], map: function (args) { return ({ uri: args[0], filepath: args[1] }); } },
        ]);
        return script_17.script("node/download", function (context) {
            try {
                var filepath = path.resolve(param.filepath);
                context.log("downloading " + param.uri + " to " + filepath);
                util.download(param.uri, filepath, function (message) { return context.log(message); })
                    .then(function () { return context.ok(); })
                    .catch(function (error) { return context.fail(error); });
            }
            catch (error) {
                context.fail(error.message);
            }
        });
    }
    exports.download = download;
});
define("node/drop", ["require", "exports", "common/signature", "core/script", "node/util", "path"], function (require, exports, signature_18, script_18, util, path) {
    "use strict";
    function drop() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var param = signature_18.signature(args, [
            { pattern: ["string"], map: function (args) { return ({ target: args[0] }); } },
        ]);
        return script_18.script("node/drop", function (context) {
            try {
                var target = path.resolve(param.target);
                util.drop(target, function (message) { return context.log(message); });
                context.ok();
            }
            catch (error) {
                context.fail(error.message);
            }
        });
    }
    exports.drop = drop;
});
define("node/mkdir", ["require", "exports", "common/signature", "core/script", "node/util", "path"], function (require, exports, signature_19, script_19, util, path) {
    "use strict";
    function mkdir() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var param = signature_19.signature(args, [
            { pattern: ["string"], map: function (args) { return ({ target: args[0] }); } },
        ]);
        return script_19.script("node/mkdir", function (context) {
            try {
                var target = path.resolve(param.target);
                context.log(target);
                util.mkdir(target, function (message) { return context.log(message); });
                context.ok();
            }
            catch (error) {
                context.fail(error.message);
            }
        });
    }
    exports.mkdir = mkdir;
});
define("node/shell", ["require", "exports", "common/signature", "core/script", "child_process", "child_process"], function (require, exports, signature_20, script_20, child_process_1, child_process_2) {
    "use strict";
    function shell() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var param = signature_20.signature(args, [
            { pattern: ["string", "number"], map: function (args) { return ({ command: args[0], exitcode: args[1] }); } },
            { pattern: ["string"], map: function (args) { return ({ command: args[0], exitcode: 0 }); } },
        ]);
        return script_20.script("node/shell", function (context) {
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
define("node/touch", ["require", "exports", "common/signature", "core/script", "node/util", "path"], function (require, exports, signature_21, script_21, util, path) {
    "use strict";
    function touch() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var param = signature_21.signature(args, [
            { pattern: ["string"], map: function (args) { return ({ filename: args[0] }); } },
        ]);
        return script_21.script("node/touch", function (context) {
            try {
                var filename = path.resolve(param.filename);
                context.log(filename);
                util.touch(filename, function (message) { return context.log(message); });
                context.ok();
            }
            catch (error) {
                context.fail(error.message);
            }
        });
    }
    exports.touch = touch;
});
define("node/watch", ["require", "exports", "common/signature", "core/script", "fs"], function (require, exports, signature_22, script_22, fs) {
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
        var param = signature_22.signature(args, [
            { pattern: ["array", "number", "boolean", "function"], map: function (args) { return ({ paths: args[0], delay: args[1], immediate: args[2], taskfunc: args[3] }); } },
            { pattern: ["array", "number", "function"], map: function (args) { return ({ paths: args[0], delay: args[1], immediate: true, taskfunc: args[2] }); } },
            { pattern: ["array", "function"], map: function (args) { return ({ paths: args[0], delay: 1000, immediate: true, taskfunc: args[1] }); } },
            { pattern: ["string", "number", "boolean", "function"], map: function (args) { return ({ paths: [args[0]], delay: args[1], immediate: args[2], taskfunc: args[3] }); } },
            { pattern: ["string", "number", "function"], map: function (args) { return ({ paths: [args[0]], delay: args[1], immediate: true, taskfunc: args[2] }); } },
            { pattern: ["string", "function"], map: function (args) { return ({ paths: [args[0]], delay: 1000, immediate: true, taskfunc: args[1] }); } }
        ]);
        return script_22.script("node/watch", function (context) {
            var task = null;
            var watchers = null;
            var completed = false;
            var cancelled = false;
            var debounce = new Debounce(200);
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
                context.log("watch change detected.");
                if (task !== null && completed === false) {
                    task.cancel("watch cancelled task.");
                }
                completed = false;
                task = param.taskfunc();
                task.subscribe(function (event) { return context.emit(event); })
                    .run()
                    .then(function () { completed = true; })
                    .catch(function () { completed = true; });
            };
            if (param.immediate === true) {
                next();
            }
            watchers = param.paths.map(function (path) { return fs.watch(path, { recursive: true }, function (event, filename) { return debounce.run(function () { return next(); }); }); });
        });
    }
    exports.watch = watch;
});
define("tasksmith-node", ["require", "exports", "core/debug", "core/delay", "core/dowhile", "core/fail", "core/format", "core/ifelse", "core/ifthen", "core/ok", "core/parallel", "core/repeat", "core/retry", "core/run", "core/script", "core/series", "core/task", "core/timeout", "core/trycatch", "node/append", "node/cli", "node/concat", "node/copy", "node/download", "node/drop", "node/mkdir", "node/shell", "node/touch", "node/watch"], function (require, exports, debug_1, delay_1, dowhile_1, fail_1, format_2, ifelse_1, ifthen_1, ok_2, parallel_1, repeat_1, retry_1, run_1, script_23, series_1, task_2, timeout_1, trycatch_1, append_1, cli_1, concat_1, copy_1, download_1, drop_1, mkdir_1, shell_1, touch_1, watch_1) {
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
    exports.run = run_1.run;
    exports.script = script_23.script;
    exports.series = series_1.series;
    exports.Task = task_2.Task;
    exports.timeout = timeout_1.timeout;
    exports.trycatch = trycatch_1.trycatch;
    exports.append = append_1.append;
    exports.cli = cli_1.cli;
    exports.concat = concat_1.concat;
    exports.copy = copy_1.copy;
    exports.download = download_1.download;
    exports.drop = drop_1.drop;
    exports.mkdir = mkdir_1.mkdir;
    exports.shell = shell_1.shell;
    exports.touch = touch_1.touch;
    exports.watch = watch_1.watch;
});

module.exports = collect();