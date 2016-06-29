/*--------------------------------------------------------------------------

amd-ts - An implementation of the amd specification in typescript.

The MIT License (MIT)

Copyright (c) 2016 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

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
var amd;
(function (amd) {
    amd.spread = function (arr, func) { return func.apply({}, arr); };
})(amd || (amd = {}));
var amd;
(function (amd) {
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
        Promise.all = function (promises) {
            return new Promise(function (resolve, reject) {
                if (promises.length === 0) {
                    resolve([]);
                }
                else {
                    var results = new Array(promises.length);
                    var completed = 0;
                    promises.forEach(function (promise, index) {
                        return promise.then(function (value) {
                            results[index] = value;
                            completed += 1;
                            if (completed === promises.length)
                                resolve(results);
                        }).catch(reject);
                    });
                }
            });
        };
        Promise.race = function (promises) {
            return new Promise(function (resolve, reject) {
                promises.forEach(function (promise, index) {
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
    amd.Promise = Promise;
})(amd || (amd = {}));
var amd;
(function (amd) {
    var loaded = false;
    var queue = [];
    window.addEventListener("load", function () {
        loaded = true;
        while (queue.length > 0)
            queue.shift()({});
    });
    function ready() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        var param = amd.signature(args, [
            { pattern: ["function"], map: function (args) { return ({ func: args[0] }); } },
            { pattern: [], map: function (args) { return ({ func: function () { } }); } },
        ]);
        return new amd.Promise(function (resolve, reject) {
            if (loaded === false) {
                queue.push(param.func);
                queue.push(resolve);
            }
            else {
                param.func({});
                resolve({});
            }
        });
    }
    amd.ready = ready;
})(amd || (amd = {}));
var amd;
(function (amd) {
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
    amd.signature = function (args, mappings) {
        var matches = mappings.filter(function (mapping) { return match(args, mapping); });
        if (matches.length === 1)
            return matches[0].map(args);
        else if (matches.length > 1)
            throw Error("signature: ambiguous arguments.");
        else
            throw Error("signature: no overload found for given arguments.");
    };
})(amd || (amd = {}));
var amd;
(function (amd) {
    var http;
    (function (http) {
        http.get = function (url) { return new amd.Promise(function (resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.addEventListener("readystatechange", function (event) {
                switch (xhr.readyState) {
                    case 4:
                        switch (xhr.status) {
                            case 200:
                                resolve(xhr.responseText);
                                break;
                            default:
                                reject("http: unable to GET content at " + url);
                                break;
                        }
                        break;
                }
            });
            xhr.open("GET", url, true);
            xhr.send();
        }); };
    })(http = amd.http || (amd.http = {}));
})(amd || (amd = {}));
var amd;
(function (amd) {
    function include() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        return new amd.Promise(function (resolve, reject) {
            var param = amd.signature(args, [
                { pattern: ["string", "function"], map: function (args) { return ({ ids: [args[0]], func: args[1] }); } },
                { pattern: ["array", "function"], map: function (args) { return ({ ids: args[0], func: args[1] }); } },
                { pattern: ["string"], map: function (args) { return ({ ids: [args[0]], func: function () { } }); } },
                { pattern: ["array"], map: function (args) { return ({ ids: args[0], func: function () { } }); } }
            ]);
            var paths = param.ids.map(function (id) { return (id.indexOf(".js") === -1) ? id + ".js" : id; });
            var requests = paths.map(function (path) { return amd.http.get(path); });
            amd.Promise.all(requests).then(function (responses) {
                responses.forEach(function (source, index) {
                    try {
                        var head = document.getElementsByTagName("head")[0];
                        var script = document.createElement("script");
                        var code = document.createTextNode(source);
                        script.type = "text/javascript";
                        script.appendChild(code);
                        head.appendChild(script);
                    }
                    catch (error) {
                        reject(error);
                    }
                    param.func({});
                    resolve({});
                });
            }).catch(reject);
        });
    }
    amd.include = include;
})(amd || (amd = {}));
var amd;
(function (amd) {
    var path;
    (function (path_1) {
        function basename(path) {
            var split = path.split('/');
            return split[split.length - 1];
        }
        path_1.basename = basename;
        function resolve(from, to) {
            if (to.indexOf("http") == 0)
                return to;
            var stack = from.split("/");
            var parts = to.split("/");
            stack.pop();
            for (var i = 0; i < parts.length; i++) {
                if (parts[i] == ".")
                    continue;
                if (parts[i] == "..")
                    stack.pop();
                else
                    stack.push(parts[i]);
            }
            return stack.join("/");
        }
        path_1.resolve = resolve;
    })(path = amd.path || (amd.path = {}));
})(amd || (amd = {}));
var amd;
(function (amd) {
    var extract = function (id, code) {
        var definitions = [];
        var define = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i - 0] = arguments[_i];
            }
            definitions.push(amd.signature(args, [
                { pattern: ["function"], map: function (args) { return ({ id: id, dependencies: [], factory: args[0] }); } },
                { pattern: ["string", "function"], map: function (args) { return ({ id: args[0], dependencies: [], factory: args[1] }); } },
                { pattern: ["string", "array", "function"], map: function (args) { return ({ id: args[0], dependencies: args[1], factory: args[2] }); } },
                { pattern: ["array", "function"], map: function (args) { return ({ id: id, dependencies: args[0], factory: args[1] }); } },
                { pattern: ["object"], map: function (args) { return ({ id: id, dependencies: [], factory: function () { return args[0]; } }); } },
                { pattern: ["string", "object"], map: function (args) { return ({ id: args[0], dependencies: [], factory: function () { return args[1]; } }); } },
                { pattern: ["string", "array", "object"], map: function (args) { return ({ id: args[0], dependencies: args[1], factory: function () { return args[2]; } }); } }
            ]));
        };
        define.amd = true;
        eval("(function(define) { " + code + "\n })")(define);
        return definitions;
    };
    amd.search = function (parameter) { return new amd.Promise(function (resolve, reject) {
        if (parameter.id === "exports" || parameter.id === "require") {
            resolve(parameter.accumulator);
            return;
        }
        if (parameter.accumulator.some(function (definition) { return definition.id === parameter.id; })) {
            resolve(parameter.accumulator);
            return;
        }
        amd.http.get(parameter.path + ".js").then(function (content) {
            var extracted = null;
            try {
                extracted = extract(parameter.id, content);
            }
            catch (error) {
                reject(error);
                return;
            }
            if (extracted.length === 0) {
                resolve(parameter.accumulator);
                return;
            }
            if (extracted.length > 1) {
                resolve(extracted);
                return;
            }
            var definition = extracted[0];
            if (parameter.accumulator.some(function (n) { return n.id === definition.id; })) {
                resolve(parameter.accumulator);
                return;
            }
            parameter.accumulator.unshift(definition);
            var searches = definition.dependencies
                .filter(function (id) { return !(parameter.accumulator.some(function (def) { return def.id === id; })); })
                .map(function (id) { return amd.search({
                id: id,
                path: amd.path.resolve(parameter.path, id),
                accumulator: parameter.accumulator
            }); });
            amd.Promise
                .all(searches)
                .then(function () { return resolve(parameter.accumulator); })
                .catch(function (error) { return reject(error); });
        }).catch(reject);
    }); };
})(amd || (amd = {}));
var amd;
(function (amd) {
    amd.resolve = function (id, space, cached) {
        if (id === "exports")
            return {};
        if (cached[id] !== undefined)
            return cached[id];
        var definitions = space.filter(function (definition) { return definition.id === id; });
        if (definitions.length === 0)
            throw Error("resolve: unable to find module " + id);
        if (definitions.length > 1)
            throw Error("resolve: found multiple defintions with the same id for " + id);
        var definition = definitions[0];
        var args = definition.dependencies.map(function (id) { return amd.resolve(id, space, cached); });
        var output = definition.factory.apply({}, args);
        if (definitions[0].dependencies.indexOf("exports") !== -1)
            output = args[definitions[0].dependencies.indexOf("exports")];
        return cached[id] = output;
    };
})(amd || (amd = {}));
var amd;
(function (amd) {
    function require() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        return new amd.Promise(function (resolve, reject) {
            var param = amd.signature(args, [
                { pattern: ["string"], map: function (args) { return ({ ids: [args[0]], callback: function () { } }); } },
                { pattern: ["array"], map: function (args) { return ({ ids: args[0], callback: function () { } }); } },
                { pattern: ["string", "function"], map: function (args) { return ({ ids: [args[0]], callback: args[1] }); } },
                { pattern: ["array", "function"], map: function (args) { return ({ ids: args[0], callback: args[1] }); } },
            ]);
            amd.ready().then(function () {
                var searches = param.ids.map(function (id) { return amd.search({
                    id: amd.path.basename(id),
                    path: id,
                    accumulator: []
                }); });
                amd.Promise.all(searches).then(function (result) {
                    var output = result.map(function (definitions) {
                        if (definitions.length === 0)
                            return undefined;
                        definitions.unshift({
                            id: "require",
                            dependencies: [],
                            factory: function () { return amd.require; }
                        });
                        var id = definitions[definitions.length - 1].id;
                        try {
                            return amd.resolve(id, definitions, {});
                        }
                        catch (error) {
                            reject(error);
                        }
                    });
                    param.callback.apply({}, output);
                    resolve(output);
                }).catch(reject);
            }).catch(reject);
        });
    }
    amd.require = require;
})(amd || (amd = {}));
