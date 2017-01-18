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
define("tasksmith-browser", ["require", "exports", "core/debug", "core/delay", "core/dowhile", "core/fail", "core/format", "core/ifelse", "core/ifthen", "core/ok", "core/parallel", "core/repeat", "core/retry", "core/run", "core/script", "core/series", "core/task", "core/timeout", "core/trycatch"], function (require, exports, debug_1, delay_1, dowhile_1, fail_1, format_2, ifelse_1, ifthen_1, ok_2, parallel_1, repeat_1, retry_1, run_1, script_13, series_1, task_2, timeout_1, trycatch_1) {
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
    exports.script = script_13.script;
    exports.series = series_1.series;
    exports.Task = task_2.Task;
    exports.timeout = timeout_1.timeout;
    exports.trycatch = trycatch_1.trycatch;
});
