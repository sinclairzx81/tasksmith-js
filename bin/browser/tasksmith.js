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
define("tasksmith-browser", ["require", "exports", "core/delay", "core/dowhile", "core/fail", "core/format", "core/ifelse", "core/ifthen", "core/ok", "core/parallel", "core/repeat", "core/retry", "core/script", "core/series", "core/task", "core/timeout", "core/trycatch"], function (require, exports, delay_1, dowhile_1, fail_1, format_1, ifelse_1, ifthen_1, ok_1, parallel_1, repeat_1, retry_1, script_13, series_1, task_2, timeout_1, trycatch_1) {
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
    exports.script = script_13.script;
    exports.series = series_1.series;
    exports.Task = task_2.Task;
    exports.timeout = timeout_1.timeout;
    exports.trycatch = trycatch_1.trycatch;
});
