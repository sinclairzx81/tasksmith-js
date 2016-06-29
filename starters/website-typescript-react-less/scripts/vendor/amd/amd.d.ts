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
declare namespace amd {
    const spread: (arr: any[], func: (...args: any[]) => void) => void;
}
declare namespace amd {
    interface Reject {
        (reason: string | Error): void;
    }
    interface Resolve<T> {
        (value: T): void;
    }
    interface Executor<T> {
        (resolve: Resolve<T>, reject: Reject): void;
    }
    class Promise<T> {
        private executor;
        private value_callbacks;
        private error_callbacks;
        state: "pending" | "fulfilled" | "rejected";
        value: T;
        error: string | Error;
        constructor(executor: Executor<T>);
        then<U>(onfulfilled: (value: T) => U | Promise<U>, onrejected?: (reason: string | Error) => void): Promise<U>;
        catch<U>(onrejected: (reason: string | Error) => U | Promise<U>): Promise<U>;
        static all<T>(promises: Promise<T>[]): Promise<T[]>;
        static race<T>(promises: Promise<T>[]): Promise<T>;
        static resolve<T>(value: T | Promise<T>): Promise<T>;
        static reject<T>(reason: string | Error): Promise<T>;
        private _resolve(value);
        private _reject(reason);
    }
}
declare namespace amd {
    function ready(callback?: (d: any) => void): amd.Promise<any>;
    function ready(): amd.Promise<any>;
}
declare namespace amd {
    type SignatureTypeName = "function" | "string" | "number" | "array" | "object" | "date" | "boolean";
    interface SignatureMapping<T> {
        pattern: SignatureTypeName[];
        map: (args: any[]) => T;
    }
    const signature: <T>(args: any[], mappings: SignatureMapping<T>[]) => T;
}
declare namespace amd.http {
    const get: (url: string) => Promise<string>;
}
declare namespace amd {
    function include(id: string, func: () => void): amd.Promise<any>;
    function include(ids: string[], func: () => void): amd.Promise<any>;
    function include(id: string): amd.Promise<any>;
    function include(ids: string[]): amd.Promise<any>;
}
declare namespace amd.path {
    function basename(path: string): string;
    function resolve(from: string, to: string): string;
}
declare namespace amd {
    interface Definition {
        id: string;
        dependencies: string[];
        factory: (...args: any[]) => any;
    }
}
declare namespace amd {
    interface SearchParameter {
        id: string;
        path: string;
        accumulator: Definition[];
    }
    const search: (parameter: SearchParameter) => Promise<Definition[]>;
}
declare namespace amd {
    const resolve: (id: string, space: Definition[], cached?: any) => any;
}
declare namespace amd {
    function require(name: string): amd.Promise<any[]>;
    function require(names: string[]): amd.Promise<any[]>;
}
