/// <reference path="../../src/node/typings/node/node.d.ts" />
declare module "common/signature" {
    export type SignatureTypeName = "function" | "string" | "number" | "array" | "object" | "date" | "boolean";
    export interface SignatureMapping<T> {
        pattern: SignatureTypeName[];
        map: (args: any[]) => T;
    }
    export const signature: <T>(args: any[], mappings: SignatureMapping<T>[]) => T;
}
declare module "common/promise" {
    export interface Reject {
        (reason: string | Error): void;
    }
    export interface Resolve<T> {
        (value: T): void;
    }
    export interface Executor<T> {
        (resolve: Resolve<T>, reject: Reject): void;
    }
    export interface Thenable<T> {
        then<U>(onfulfilled: (value: T) => U | Thenable<U>, onrejected?: (reason: string | Error) => void): Thenable<U>;
        catch<U>(onrejected: (reason: string | Error) => U | Thenable<U>): Thenable<U>;
    }
    export class Promise<T> implements Thenable<T> {
        private executor;
        private value_callbacks;
        private error_callbacks;
        state: "pending" | "fulfilled" | "rejected";
        value: T;
        error: string | Error;
        constructor(executor: Executor<T>);
        then<U>(onfulfilled: (value: T) => U | Thenable<U>, onrejected?: (reason: string | Error) => void): Thenable<U>;
        catch<U>(onrejected: (reason: string | Error) => U | Thenable<U>): Thenable<U>;
        static all<T>(thenables: Thenable<T>[]): Thenable<T[]>;
        static race<T>(thenables: Thenable<T>[]): Thenable<T>;
        static resolve<T>(value: T | Thenable<T>): Thenable<T>;
        static reject<T>(reason: string | Error): Thenable<T>;
        private _resolve(value);
        private _reject(reason);
    }
}
declare module "core/task" {
    import { Promise } from "common/promise";
    export interface TaskEvent {
        id: string;
        task: string;
        time: Date;
        type: "start" | "log" | "ok" | "fail";
        data: string;
    }
    export interface ITask {
        subscribe(func: (event: TaskEvent) => void): ITask;
        run(): Promise<string>;
    }
    export type State = "pending" | "running" | "completed" | "failed";
    export class Task implements ITask {
        private name;
        private func;
        private subscribers;
        private state;
        private id;
        constructor(name: string, func: (id: string, emit: (event: TaskEvent) => void) => void);
        subscribe(subscriber: (event: TaskEvent) => void): ITask;
        run(): Promise<string>;
    }
}
declare module "core/script" {
    import { Promise } from "common/promise";
    import { ITask } from "core/task";
    export interface IScriptContext {
        log(...args: any[]): void;
        ok(...args: any[]): void;
        fail(...args: any[]): void;
        run(task: ITask): Promise<string>;
    }
    export function script(func: (context: IScriptContext) => void): ITask;
    export function script(name: string, func: (context: IScriptContext) => void): ITask;
}
declare module "core/delay" {
    import { ITask } from "core/task";
    export function delay(message: string, ms: number): ITask;
    export function delay(ms: number): ITask;
}
declare module "core/dowhile" {
    import { ITask } from "core/task";
    export interface NextFunction<T> {
        (value: T): void;
    }
    export interface ResolveFunction<T> {
        (next: NextFunction<T>): void;
    }
    export function dowhile(message: string, condition: ResolveFunction<boolean>, taskfunc: () => ITask): ITask;
    export function dowhile(condition: ResolveFunction<boolean>, taskfunc: () => ITask): ITask;
}
declare module "core/fail" {
    import { ITask } from "core/task";
    export function fail(message: string): ITask;
    export function fail(): ITask;
}
declare module "common/tabulate" {
    export interface TabulateMapping {
        key: string;
        width?: number;
        pad?: number;
        wrap?: boolean;
        map?: (obj: any) => string;
    }
    export interface TabulateObject {
        [key: string]: string;
    }
    export interface TabulateFunction {
        (obj: TabulateObject): string;
    }
    export const tabulate: (mappings: TabulateMapping[]) => TabulateFunction;
}
declare module "core/format" {
    export const format: (event: any) => string;
}
declare module "core/ifelse" {
    import { ITask } from "core/task";
    export interface NextFunction<T> {
        (value: T): void;
    }
    export interface ResolveFunction<T> {
        (next: NextFunction<T>): void;
    }
    export function ifelse(message: string, condition: ResolveFunction<boolean>, left: () => ITask, right: () => ITask): ITask;
    export function ifelse(condition: ResolveFunction<boolean>, left: () => ITask, right: () => ITask): ITask;
}
declare module "core/ifthen" {
    import { ITask } from "core/task";
    export interface NextFunction<T> {
        (value: T): void;
    }
    export interface ResolveFunction<T> {
        (next: NextFunction<T>): void;
    }
    export function ifthen(message: string, condition: ResolveFunction<boolean>, task: () => ITask): ITask;
    export function ifthen(condition: ResolveFunction<boolean>, task: () => ITask): ITask;
}
declare module "core/ok" {
    import { ITask } from "core/task";
    export function ok(info: string): ITask;
    export function ok(): ITask;
}
declare module "core/parallel" {
    import { ITask } from "core/task";
    export function parallel(message: string, tasks: Array<ITask>): ITask;
    export function parallel(tasks: Array<ITask>): ITask;
}
declare module "core/repeat" {
    import { ITask } from "core/task";
    export function repeat(message: string, iterations: number, taskfunc: (iteration: number) => ITask): ITask;
    export function repeat(iterations: number, taskfunc: (iteration: number) => ITask): ITask;
}
declare module "core/retry" {
    import { ITask } from "core/task";
    export function retry(message: string, retries: number, taskfunc: (iteration: number) => ITask): ITask;
    export function retry(retries: number, taskfunc: (iteration: number) => ITask): ITask;
}
declare module "core/series" {
    import { ITask } from "core/task";
    export function series(message: string, tasks: Array<ITask>): ITask;
    export function series(tasks: Array<ITask>): ITask;
}
declare module "core/timeout" {
    import { ITask } from "core/task";
    export function timeout(message: string, ms: number, taskfunc: () => ITask): ITask;
    export function timeout(ms: number, taskfunc: () => ITask): ITask;
}
declare module "core/trycatch" {
    import { ITask } from "core/task";
    export function trycatch(message: string, left: () => ITask, right: () => ITask): ITask;
    export function trycatch(left: () => ITask, right: () => ITask): ITask;
}
declare module "node/fs/append" {
    import { ITask } from "core/task";
    export function append(message: string, target: string, content: string): ITask;
    export function append(target: string, content: string): ITask;
}
declare module "node/cli" {
    import { ITask } from "core/task";
    export const cli: (argv: string[], tasks: {
        [taskname: string]: ITask;
    }) => ITask;
}
declare module "node/fs/concat" {
    import { ITask } from "core/task";
    export function concat(message: string, target: string, sources: string[]): ITask;
    export function concat(filename: string, target: string[]): ITask;
}
declare module "node/fs/common" {
    import * as fs from "fs";
    export const fs_message: (context: string, args: string[]) => string;
    export const fs_error: (context: string, message: string, path: string) => Error;
    export const fs_resolve_path: (p: string) => string;
    export interface FsInfo {
        type: "invalid" | "empty" | "file" | "directory";
        basename: string;
        dirname: string;
        relname: string;
        stat: fs.Stats;
    }
    export const fs_info: (src: string) => FsInfo;
    export const fs_tree: (src: string) => FsInfo[];
    export const fs_build_directory: (directory: string) => void;
    export const fs_copy_file: (src: string, dst: string) => void;
}
declare module "node/fs/copy" {
    import { ITask } from "core/task";
    export function copy(message: string, src: string, directory: string): ITask;
    export function copy(src: string, directory: string): ITask;
}
declare module "node/fs/drop" {
    import { ITask } from "core/task";
    export function drop(message: string, target: string): ITask;
    export function drop(src: string, target: string): ITask;
}
declare module "node/http/signals" {
    import * as http from "http";
    export const createServer: (directory: string, watch: boolean, log: (...args: any[]) => void) => http.Server;
}
declare module "node/serve" {
    import { ITask } from "core/task";
    export function serve(message: string, directory: string, port: number, watch: boolean): ITask;
    export function serve(directory: string, port: number, watch: boolean): ITask;
    export function serve(message: string, directory: string, port: number): ITask;
    export function serve(directory: string, port: number): ITask;
}
declare module "node/shell" {
    import { ITask } from "core/task";
    export function shell(message: string, command: string, exitcode: number): ITask;
    export function shell(command: string, exitcode: number): ITask;
    export function shell(message: string, command: string): ITask;
    export function shell(command: string): ITask;
}
declare module "node/watch" {
    import { ITask } from "core/task";
    export function watch(message: string, path: string, immediate: boolean, taskfunc: () => ITask): ITask;
    export function watch(path: string, immediate: boolean, taskfunc: () => ITask): ITask;
    export function watch(message: string, path: string, taskfunc: () => ITask): ITask;
    export function watch(path: string, taskfunc: () => ITask): ITask;
}
declare module "tasksmith-node" {
    import { delay } from "core/delay";
    import { dowhile } from "core/dowhile";
    import { fail } from "core/fail";
    import { format } from "core/format";
    import { ifelse } from "core/ifelse";
    import { ifthen } from "core/ifthen";
    import { ok } from "core/ok";
    import { parallel } from "core/parallel";
    import { repeat } from "core/repeat";
    import { retry } from "core/retry";
    import { script } from "core/script";
    import { series } from "core/series";
    import { ITask, Task, TaskEvent } from "core/task";
    import { timeout } from "core/timeout";
    import { trycatch } from "core/trycatch";
    import { append } from "node/fs/append";
    import { cli } from "node/cli";
    import { concat } from "node/fs/concat";
    import { copy } from "node/fs/copy";
    import { drop } from "node/fs/drop";
    import { serve } from "node/serve";
    import { shell } from "node/shell";
    import { watch } from "node/watch";
    export { delay, dowhile, fail, format, ifelse, ifthen, ok, parallel, repeat, retry, script, series, ITask, Task, TaskEvent, timeout, trycatch, append, cli, concat, copy, drop, serve, shell, watch };
}
