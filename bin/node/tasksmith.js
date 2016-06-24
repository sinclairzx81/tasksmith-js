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
    var Task = (function () {
        function Task(name, func) {
            this.name = name;
            this.func = func;
            this.subscribers = new Array();
            this.state = "pending";
            this.id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }
        Task.prototype.subscribe = function (subscriber) {
            this.subscribers.push(subscriber);
            return this;
        };
        Task.prototype.run = function () {
            var _this = this;
            if (this.state !== "pending") {
                return new promise_1.Promise(function (_, reject) { return reject("this task has already started."); });
            }
            else {
                return new promise_1.Promise(function (resolve, reject) {
                    try {
                        _this.state = "running";
                        _this.subscribers.forEach(function (subscriber) { return subscriber({
                            id: _this.id,
                            task: _this.name,
                            time: new Date(),
                            type: "start",
                            data: ""
                        }); });
                        _this.func(_this.id, function (event) {
                            switch (event.type) {
                                case "start":
                                    if (_this.state === "running") {
                                        _this.subscribers.forEach(function (subscriber) { return subscriber(event); });
                                    }
                                    break;
                                case "log":
                                    if (_this.state === "running") {
                                        _this.subscribers.forEach(function (subscriber) { return subscriber(event); });
                                    }
                                    break;
                                case "ok":
                                    if (_this.state === "running") {
                                        _this.subscribers.forEach(function (subscriber) { return subscriber(event); });
                                        if (event.id === _this.id) {
                                            _this.state = "completed";
                                            resolve(event.data);
                                        }
                                    }
                                    break;
                                case "fail":
                                    if (_this.state === "running") {
                                        _this.subscribers.forEach(function (subscriber) { return subscriber(event); });
                                        if (event.id === _this.id) {
                                            _this.state = "failed";
                                            reject(event.data);
                                        }
                                    }
                                    break;
                            }
                        });
                    }
                    catch (error) {
                        if (_this.state === "running") {
                            _this.state = "failed";
                            _this.subscribers.forEach(function (subscriber) { return subscriber({
                                id: _this.id,
                                task: _this.name,
                                time: new Date(),
                                type: "fail",
                                data: error.message
                            }); });
                            reject(error);
                        }
                    }
                });
            }
        };
        return Task;
    }());
    exports.Task = Task;
});
define("core/script", ["require", "exports", "common/signature", "core/task"], function (require, exports, signature_1, task_1) {
    "use strict";
    function format(args) {
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
    }
    function script() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_1.signature(args, [
            { pattern: ["string", "function"], map: function (args) { return ({ task: args[0], func: args[1] }); } },
            { pattern: ["function"], map: function (args) { return ({ task: "core/script", func: args[0] }); } },
        ]);
        return new task_1.Task(param.task, function (id, emitter) {
            param.func({
                log: function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i - 0] = arguments[_i];
                    }
                    return emitter({ id: id, task: param.task, time: new Date(), type: "log", data: format(args) });
                },
                ok: function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i - 0] = arguments[_i];
                    }
                    return emitter({ id: id, task: param.task, time: new Date(), type: "ok", data: format(args) });
                },
                fail: function () {
                    var args = [];
                    for (var _i = 0; _i < arguments.length; _i++) {
                        args[_i - 0] = arguments[_i];
                    }
                    return emitter({ id: id, task: param.task, time: new Date(), type: "fail", data: format(args) });
                },
                run: function (task) { return task.subscribe(function (event) { return emitter(event); }).run(); }
            });
        });
    }
    exports.script = script;
});
define("core/delay", ["require", "exports", "common/signature", "core/script"], function (require, exports, signature_2, script_1) {
    "use strict";
    function delay() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_2.signature(args, [
            { pattern: ["string", "number"], map: function (args) { return ({ message: args[0], ms: args[1] }); } },
            { pattern: ["number"], map: function (args) { return ({ message: null, ms: args[0] }); } },
        ]);
        return script_1.script("core/delay", function (context) {
            if (param.message !== null)
                context.log(param.message);
            setTimeout(function () { return context.ok(); }, param.ms);
        });
    }
    exports.delay = delay;
});
define("core/dowhile", ["require", "exports", "common/signature", "core/script"], function (require, exports, signature_3, script_2) {
    "use strict";
    function dowhile() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_3.signature(args, [
            { pattern: ["string", "function", "function"], map: function (args) { return ({ message: args[0], condition: args[1], taskfunc: args[2] }); } },
            { pattern: ["function", "function"], map: function (args) { return ({ message: null, condition: args[0], taskfunc: args[1] }); } },
        ]);
        return script_2.script("core/dowhile", function (context) {
            if (param.message !== null)
                context.log(param.message);
            var next = function () {
                context.run(param.taskfunc())
                    .then(function () { return param.condition(function (result) { return (result) ? next() : context.ok(); }); })
                    .catch(function (error) { return context.fail(error); });
            };
            next();
        });
    }
    exports.dowhile = dowhile;
});
define("core/fail", ["require", "exports", "common/signature", "core/script"], function (require, exports, signature_4, script_3) {
    "use strict";
    function fail() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_4.signature(args, [
            { pattern: ["string"], map: function (args) { return ({ message: args[0] }); } },
            { pattern: [], map: function (args) { return ({ message: null }); } },
        ]);
        return script_3.script("core/fail", function (context) {
            if (param.message !== null)
                context.log(param.message);
            context.fail();
        });
    }
    exports.fail = fail;
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
        { key: "task", width: 16, pad: 1 },
        { key: "data", width: 80, wrap: true },
    ]);
    exports.format = function (event) { return event_format(event); };
});
define("core/ifelse", ["require", "exports", "common/signature", "core/script"], function (require, exports, signature_5, script_4) {
    "use strict";
    function ifelse() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_5.signature(args, [
            { pattern: ["string", "function", "function", "function"], map: function (args) { return ({ message: args[0], condition: args[1], left: args[2], right: args[3] }); } },
            { pattern: ["function", "function", "function"], map: function (args) { return ({ message: null, condition: args[0], left: args[1], right: args[2] }); } },
        ]);
        return script_4.script("core/ifelse", function (context) {
            param.condition(function (result) {
                var task = (result) ? param.left() : param.right();
                context.run(task)
                    .then(function () { return context.ok(); })
                    .catch(function (error) { return context.fail(error); });
            });
        });
    }
    exports.ifelse = ifelse;
});
define("core/ifthen", ["require", "exports", "common/signature", "core/script"], function (require, exports, signature_6, script_5) {
    "use strict";
    function ifthen() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_6.signature(args, [
            { pattern: ["string", "function", "function"], map: function (args) { return ({ message: args[0], condition: args[1], taskfunc: args[2] }); } },
            { pattern: ["function", "function"], map: function (args) { return ({ message: null, condition: args[0], taskfunc: args[1] }); } },
        ]);
        return script_5.script("core/ifthen", function (context) {
            if (param.message !== null)
                context.log(param.message);
            param.condition(function (result) {
                if (result === false) {
                    context.ok();
                }
                else {
                    var task = param.taskfunc();
                    context.run(task)
                        .then(function () { return context.ok(); })
                        .catch(function (error) { return context.fail(error); });
                }
            });
        });
    }
    exports.ifthen = ifthen;
});
define("core/ok", ["require", "exports", "common/signature", "core/script"], function (require, exports, signature_7, script_6) {
    "use strict";
    function ok() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_7.signature(args, [
            { pattern: ["string"], map: function (args) { return ({ info: args[0] }); } },
            { pattern: [], map: function (args) { return ({ info: null }); } },
        ]);
        return script_6.script("core/ok", function (context) {
            if (param.info !== null)
                context.log(param.info);
            context.ok();
        });
    }
    exports.ok = ok;
});
define("core/parallel", ["require", "exports", "common/promise", "common/signature", "core/script"], function (require, exports, promise_2, signature_8, script_7) {
    "use strict";
    function parallel() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_8.signature(args, [
            { pattern: ["string", "array"], map: function (args) { return ({ message: args[0], tasks: args[1] }); } },
            { pattern: ["array"], map: function (args) { return ({ message: null, tasks: args[0] }); } },
        ]);
        return script_7.script("core/parallel", function (context) {
            if (param.message !== null)
                context.log(param.message);
            var thenables = param.tasks.map(function (task) { return context.run(task); });
            promise_2.Promise.all(thenables)
                .then(function () { return context.ok(); })
                .catch(function (error) { return context.fail(error); });
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
            { pattern: ["string", "number", "function"], map: function (args) { return ({ message: args[0], iterations: args[1], taskfunc: args[2] }); } },
            { pattern: ["number", "function"], map: function (args) { return ({ message: null, iterations: args[0], taskfunc: args[1] }); } },
        ]);
        return script_8.script("core/repeat", function (context) {
            if (param.message !== null)
                context.log(param.message);
            var iteration = 0;
            var next = function () {
                if (iteration === param.iterations) {
                    context.ok();
                }
                else {
                    iteration += 1;
                    context.run(param.taskfunc(iteration))
                        .then(function () { return next(); })
                        .catch(function (error) { return context.fail(error); });
                }
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
            { pattern: ["string", "number", "function"], map: function (args) { return ({ message: args[0], retries: args[1], taskfunc: args[2] }); } },
            { pattern: ["number", "function"], map: function (args) { return ({ message: null, retries: args[0], taskfunc: args[1] }); } },
        ]);
        return script_9.script("core/retry", function (context) {
            if (param.message !== null)
                context.log(param.message);
            var iteration = 0;
            var next = function () {
                if (iteration === param.retries) {
                    context.fail();
                }
                else {
                    iteration += 1;
                    context.run(param.taskfunc(iteration))
                        .then(function () { return context.ok(); })
                        .catch(function (error) { return next(); });
                }
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
            { pattern: ["string", "array"], map: function (args) { return ({ message: args[0], tasks: args[1] }); } },
            { pattern: ["array"], map: function (args) { return ({ message: null, tasks: args[0] }); } },
        ]);
        return script_10.script("core/series", function (context) {
            if (param.message !== null)
                context.log(param.message);
            var next = function () {
                if (param.tasks.length === 0) {
                    context.ok();
                }
                else {
                    context.run(param.tasks.shift())
                        .then(next)
                        .catch(function (error) { return context.fail(error); });
                }
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
            { pattern: ["string", "number", "function"], map: function (args) { return ({ message: args[0], ms: args[1], taskfunc: args[2] }); } },
            { pattern: ["number", "function"], map: function (args) { return ({ message: null, ms: args[0], taskfunc: args[1] }); } },
        ]);
        return script_11.script("core/timeout", function (context) {
            if (param.message !== null)
                context.log(param.message);
            var timeout = setTimeout(function () { return context.fail("timeout elapsed."); }, param.ms);
            context.run(param.taskfunc())
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
            { pattern: ["string", "function", "function"], map: function (args) { return ({ message: args[0], left: args[1], right: args[2] }); } },
            { pattern: ["function", "function"], map: function (args) { return ({ message: null, left: args[0], right: args[1] }); } },
        ]);
        return script_12.script("core/trycatch", function (context) {
            if (param.message !== null)
                context.log(param.message);
            context.run(param.left())
                .then(function () { return context.ok(); })
                .catch(function (error) {
                context.run(param.right())
                    .then(function () { return context.ok(); })
                    .catch(function (error) { return context.fail(error); });
            });
        });
    }
    exports.trycatch = trycatch;
});
define("node/fs/append", ["require", "exports", "common/signature", "core/script", "fs"], function (require, exports, signature_14, script_13, fs) {
    "use strict";
    function append() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_14.signature(args, [
            { pattern: ["string", "string", "array"], map: function (args) { return ({ message: args[0], target: args[1], content: args[2] }); } },
            { pattern: ["string", "array"], map: function (args) { return ({ message: null, target: args[0], content: args[1] }); } },
        ]);
        return script_13.script("node/fs/append", function (context) {
            if (param.message !== null)
                context.log(param.message);
            try {
                fs.writeFileSync(param.target, [fs.readFileSync(param.target, "utf8"), param.content].join("\n"));
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
            context.run(task).then(function (_) { return context.ok(); })
                .catch(function (error) { return context.fail(error); });
        }
    }); };
});
define("node/fs/concat", ["require", "exports", "common/signature", "core/script", "fs"], function (require, exports, signature_15, script_15, fs) {
    "use strict";
    function concat() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_15.signature(args, [
            { pattern: ["string", "string", "array"], map: function (args) { return ({ message: args[0], target: args[1], sources: args[2] }); } },
            { pattern: ["string", "array"], map: function (args) { return ({ message: null, target: args[0], sources: args[1] }); } },
        ]);
        return script_15.script("node/fs/concat", function (context) {
            if (param.message !== null)
                context.log(param.message);
            try {
                var output = param.sources.map(function (file) { return fs.readFileSync(file, "utf8"); }).join("\n");
                fs.writeFileSync(param.target, output);
                context.ok();
            }
            catch (error) {
                context.fail(error.message);
            }
        });
    }
    exports.concat = concat;
});
define("node/fs/common", ["require", "exports", "path", "fs"], function (require, exports, path, fs) {
    "use strict";
    exports.fs_message = function (context, args) {
        return " - " + [context, args.join(" ")].join(": ");
    };
    exports.fs_error = function (context, message, path) {
        return new Error([context, message, path].join(": "));
    };
    exports.fs_resolve_path = function (p) { return path.resolve(p); };
    exports.fs_info = function (src) {
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
    exports.fs_tree = function (src) {
        var src_info = exports.fs_info(src);
        switch (src_info.type) {
            case "invalid": throw exports.fs_error("fs_tree", "src path is invalid.", src);
            case "empty": throw exports.fs_error("fs_tree", "src exist doesn't exist.", src);
            case "directory": break;
            case "file": break;
        }
        var buffer = [];
        var seek = function (src, rel) {
            var info = exports.fs_info(src);
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
    exports.fs_build_directory = function (directory) {
        var info = exports.fs_info(directory);
        switch (info.type) {
            case "directory": break;
            case "invalid": throw exports.fs_error("fs_build_directory", "directory path is invalid", directory);
            case "file": throw exports.fs_error("fs_build_directory", "directory path points to a file.", directory);
            case "empty":
                var parent_1 = path.dirname(directory);
                if (fs.existsSync(parent_1) === false)
                    exports.fs_build_directory(parent_1);
                fs.mkdirSync(path.join(info.dirname, info.basename));
                break;
        }
    };
    exports.fs_copy_file = function (src, dst) {
        var src_info = exports.fs_info(src);
        var dst_info = exports.fs_info(dst);
        switch (src_info.type) {
            case "empty": throw exports.fs_error("fs_copy_file", "src file path doesn't exist.", src);
            case "invalid": throw exports.fs_error("fs_copy_file", "src file path is invalid.", src);
            case "directory": throw exports.fs_error("fs_copy_file", "attempted to link a directory", src);
            case "file": break;
        }
        switch (dst_info.type) {
            case "directory": throw exports.fs_error("fs_copy_file", "dst file path found directory named the same.", dst);
            case "invalid": throw exports.fs_error("fs_copy_file", "dst file path is invalid.", dst);
            case "empty":
            case "file":
                exports.fs_build_directory(dst_info.dirname);
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
define("node/fs/copy", ["require", "exports", "common/signature", "core/script", "node/fs/common", "path"], function (require, exports, signature_16, script_16, common, path) {
    "use strict";
    function copy() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_16.signature(args, [
            { pattern: ["string", "string", "string"], map: function (args) { return ({ message: args[0], src: args[1], directory: args[2] }); } },
            { pattern: ["string", "string"], map: function (args) { return ({ message: null, src: args[0], directory: args[1] }); } },
        ]);
        return script_16.script("node/fs/copy", function (context) {
            if (param.message !== null)
                context.log(param.message);
            try {
                var src_1 = common.fs_resolve_path(param.src);
                var dst = common.fs_resolve_path(param.directory);
                var dst_info_1 = common.fs_info(dst);
                var gather = common.fs_tree(src_1);
                gather.forEach(function (src_info) {
                    switch (src_info.type) {
                        case "invalid": throw common.fs_error("copy", "invalid file or directory src path.", src_1);
                        case "empty": throw common.fs_error("copy", "no file or directory exists at the given src.", src_1);
                        case "directory":
                            var directory = path.join(dst_info_1.dirname, dst_info_1.basename, src_info.relname);
                            context.log(common.fs_message("mkdir", [directory]));
                            common.fs_build_directory(directory);
                            break;
                        case "file":
                            var source = path.join(src_info.dirname, src_info.basename);
                            var target = path.join(dst_info_1.dirname, dst_info_1.basename, src_info.relname, src_info.basename);
                            context.log(common.fs_message("copy", [source, target]));
                            common.fs_copy_file(source, target);
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
define("node/fs/drop", ["require", "exports", "common/signature", "core/script", "node/fs/common", "path", "fs"], function (require, exports, signature_17, script_17, common, path, fs) {
    "use strict";
    function drop() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_17.signature(args, [
            { pattern: ["string", "string"], map: function (args) { return ({ message: args[0], target: args[1] }); } },
            { pattern: ["string"], map: function (args) { return ({ message: null, target: args[0] }); } },
        ]);
        return script_17.script("node/fs/drop", function (context) {
            if (param.message !== null)
                context.log(param.message);
            try {
                var src = common.fs_resolve_path(param.target);
                var dst_info = common.fs_info(src);
                var gather = common.fs_tree(src);
                gather.reverse();
                gather.forEach(function (src_info) {
                    switch (src_info.type) {
                        case "empty": break;
                        case "invalid": break;
                        case "directory":
                            var directory = path.join(src_info.dirname, src_info.basename);
                            context.log(common.fs_message("drop", [directory]));
                            fs.rmdirSync(directory);
                            break;
                        case "file":
                            var filename = path.join(src_info.dirname, src_info.basename);
                            context.log(common.fs_message("drop", [filename]));
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
define("node/http/signals", ["require", "exports", "http", "fs", "path"], function (require, exports, http, fs, path) {
    "use strict";
    var signals_script = function () { return "    \n<script type=\"text/javascript\">\nwindow.addEventListener(\"load\", function() {\n  var signals = function(callback) {\n  var xhr     = new XMLHttpRequest();\n  var idx     = 0;\n  xhr.addEventListener(\"readystatechange\", function(event) {\n    switch(xhr.readyState) {\n      case 4: callback(\"signals disconnected.\"); break;\n      case 3:\n        var signal = xhr.response.substr(idx);\n        idx += signal.length;\n        callback(signal);\n        break;\n    }\n  });\n  xhr.open(\"GET\", \"/__signals\", true); \n  xhr.send();\n  }\n  signals(function(signal) {\n    switch(signal) {\n      case \"reload\": window.location.reload(); break;\n      case \"done\": console.log(\"disconnected\"); break;\n    }\n  });\n});</script>".replace("\n", "")
        .replace("\t", ""); };
    var inject_signals_script = function (content) {
        var html_idx = content.indexOf("<html>");
        if (html_idx === -1) {
            content = [
                "<html>",
                content,
                "</html>"
            ].join("");
            html_idx = 6;
        }
        else
            html_idx += 6;
        var head_idx = content.indexOf("<head>");
        if (head_idx === -1) {
            var head_prefix = content.slice(0, html_idx);
            var head_content = "<head></head>";
            var head_postfix = content.slice(html_idx);
            content = [
                head_prefix,
                head_content,
                head_postfix
            ].join("");
            head_idx = 12;
        }
        else
            head_idx += 6;
        var signals_prefix = content.slice(0, head_idx);
        var signals_content = signals_script();
        var signals_postfix = content.slice(head_idx);
        content = [
            signals_prefix,
            signals_content,
            signals_postfix
        ].join("");
        return content;
    };
    var serve_signals = function (directory, log, request, response) {
        response.on("end", function () { return log("detected client drop."); });
        response.writeHead(200, { "Content-Type": "text/plain" });
        var handle = setTimeout(function () { return response.write("reload"); }, 500);
        var temp = request;
        temp.connection.on("end", function () { return clearInterval(handle); });
    };
    var serve_static = function (directory, log, request, response) {
        var filePath = "." + request.url;
        if (filePath == "./")
            filePath = "./index.html";
        var contentType = "application/octet-stream";
        switch (path.extname(filePath)) {
            case ".js":
                contentType = "text/javascript";
                break;
            case ".css":
                contentType = "text/css";
                break;
            case ".json":
                contentType = "application/json";
                break;
            case ".png":
                contentType = "image/png";
                break;
            case ".jpeg":
            case ".jpg":
                contentType = "image/jpg";
                break;
            case ".wav":
                contentType = "audio/wav";
                break;
            case ".mp3":
                contentType = "audio/mpeg";
                break;
            case ".htm":
            case ".html":
                contentType = "text/html";
                break;
        }
        fs.readFile(filePath, function (error, content) {
            if (error) {
                switch (error.code) {
                    case "ENOENT":
                        response.writeHead(404, { "Content-Type": "text/plain" });
                        response.end("404 - not found", "utf-8");
                        break;
                    default:
                        response.writeHead(500, { "Content-Type": "text/plain" });
                        response.end("500 - server error " + error.message, "utf-8");
                        break;
                }
                return;
            }
            response.writeHead(200, { "Content-Type": contentType });
            response.end(content, "utf-8");
        });
    };
    exports.createServer = function (directory, watch, log) { return http.createServer(function (request, response) {
        switch (request.url) {
            case "__signals":
                serve_signals(directory, log, request, response);
                break;
            default:
                serve_static(directory, log, request, response);
                break;
        }
    }); };
});
define("node/serve", ["require", "exports", "common/signature", "core/script", "node/http/signals"], function (require, exports, signature_18, script_18, signals_1) {
    "use strict";
    function serve() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_18.signature(args, [
            { pattern: ["string", "string", "number", "boolean"], map: function (args) { return ({ message: args[0], directory: args[1], port: args[2], watch: args[3] }); } },
            { pattern: ["string", "number", "boolean"], map: function (args) { return ({ message: null, directory: args[0], port: args[1], watch: args[2] }); } },
            { pattern: ["string", "string", "number"], map: function (args) { return ({ message: args[0], directory: args[1], port: args[2], watch: false }); } },
            { pattern: ["string", "number"], map: function (args) { return ({ message: null, directory: args[0], port: args[1], watch: false }); } }
        ]);
        return script_18.script("node/serve", function (context) {
            if (param.message !== null)
                context.log(param.message);
            signals_1.createServer(param.directory, param.watch, function (args) { return context.log(args); }).listen(param.port);
        });
    }
    exports.serve = serve;
});
define("node/shell", ["require", "exports", "common/signature", "core/script", "child_process"], function (require, exports, signature_19, script_19, child_process_1) {
    "use strict";
    function shell() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_19.signature(args, [
            { pattern: ["string", "string", "number"], map: function (args) { return ({ message: args[0], command: args[1], exitcode: args[2] }); } },
            { pattern: ["string", "number"], map: function (args) { return ({ message: null, command: args[0], exitcode: args[1] }); } },
            { pattern: ["string", "string"], map: function (args) { return ({ message: args[0], command: args[1], exitcode: 0 }); } },
            { pattern: ["string"], map: function (args) { return ({ message: null, command: args[0], exitcode: 0 }); } },
        ]);
        return script_19.script("node/shell", function (context) {
            if (param.message !== null)
                context.log(param.message);
            var windows = /^win/.test(process.platform);
            var proc = child_process_1.spawn(windows ? 'cmd' : 'sh', [windows ? '/c' : '-c', param.command]);
            proc.stdout.setEncoding("utf8");
            proc.stdout.on("data", function (data) { return context.log("stdout:", data); });
            proc.stderr.on("data", function (data) { return context.log("stderr:", data); });
            proc.on("error", function (error) { return context.fail(error.toString); });
            proc.on("close", function (code) {
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
define("node/watch", ["require", "exports", "common/signature", "core/script", "fs"], function (require, exports, signature_20, script_20, fs_1) {
    "use strict";
    function watch() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = signature_20.signature(args, [
            { pattern: ["string", "string", "boolean", "function"], map: function (args) { return ({ message: args[0], path: args[1], immediate: args[2], taskfunc: args[3] }); } },
            { pattern: ["string", "boolean", "function"], map: function (args) { return ({ message: null, path: args[0], immediate: args[1], taskfunc: args[2] }); } },
            { pattern: ["string", "string", "function"], map: function (args) { return ({ message: args[0], path: args[1], immediate: true, taskfunc: args[2] }); } },
            { pattern: ["string", "function"], map: function (args) { return ({ message: null, path: args[0], immediate: true, taskfunc: args[1] }); } }
        ]);
        return script_20.script("node/watch", function (context) {
            if (param.message !== null)
                context.log(param.message);
            var waiting_on_signal = true;
            var runtask = function () {
                if (waiting_on_signal === true) {
                    waiting_on_signal = false;
                    var task = param.taskfunc();
                    context.run(task)
                        .then(function () { waiting_on_signal = true; })
                        .catch(function (error) { return context.fail(error); });
                }
            };
            if (param.immediate === true)
                runtask();
            fs_1.watch(param.path, { recursive: true }, function (event, filename) { return runtask(); });
        });
    }
    exports.watch = watch;
});
define("tasksmith-node", ["require", "exports", "core/delay", "core/dowhile", "core/fail", "core/format", "core/ifelse", "core/ifthen", "core/ok", "core/parallel", "core/repeat", "core/retry", "core/script", "core/series", "core/task", "core/timeout", "core/trycatch", "node/fs/append", "node/cli", "node/fs/concat", "node/fs/copy", "node/fs/drop", "node/serve", "node/shell", "node/watch"], function (require, exports, delay_1, dowhile_1, fail_1, format_1, ifelse_1, ifthen_1, ok_1, parallel_1, repeat_1, retry_1, script_21, series_1, task_2, timeout_1, trycatch_1, append_1, cli_1, concat_1, copy_1, drop_1, serve_1, shell_1, watch_1) {
    "use strict";
    exports.delay = delay_1.delay;
    exports.dowhile = dowhile_1.dowhile;
    exports.fail = fail_1.fail;
    exports.format = format_1.format;
    exports.ifelse = ifelse_1.ifelse;
    exports.ifthen = ifthen_1.ifthen;
    exports.ok = ok_1.ok;
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