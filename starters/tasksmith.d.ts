/// <reference path="../src/node/node.d.ts" />
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
    export class TaskCancellation {
        private state;
        private subscribers;
        constructor();
        subscribe(func: (reason: string) => void): void;
        cancel(reason: string): void;
    }
    export interface TaskEvent {
        id: string;
        name: string;
        time: Date;
        type: string;
        data: string;
    }
    export interface TaskContext {
        emit: (event: TaskEvent) => void;
        log: (...args: any[]) => void;
        ok: (...args: any[]) => void;
        fail: (...args: any[]) => void;
        oncancel: (func: (...args: any[]) => void) => void;
    }
    export interface TaskExecutor {
        (context: TaskContext): void;
    }
    export type TaskState = "pending" | "started" | "completed" | "failed" | "cancelled";
    export interface ITask {
        subscribe(func: (event: TaskEvent) => void): ITask;
        run(): Promise<string>;
        cancel(reason?: string): void;
    }
    export class Task implements ITask {
        private subscribers;
        private id;
        private name;
        private state;
        private executor;
        private cancellor;
        constructor(name: string, task_executor: TaskExecutor, task_cancellor?: TaskCancellation);
        run(): Promise<string>;
        cancel(reason?: string): void;
        subscribe(func: (event: TaskEvent) => void): ITask;
        private _notify(event);
    }
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
declare module "core/debug" {
    import { Promise } from "common/promise";
    import { ITask } from "core/task";
    export const debug: (task: ITask) => Promise<string>;
}
declare module "common/signature" {
    export type SignatureTypeName = "function" | "string" | "number" | "array" | "object" | "date" | "boolean";
    export interface SignatureMapping<T> {
        pattern: SignatureTypeName[];
        map: (args: any[]) => T;
    }
    export const signature: <T>(args: any[], mappings: SignatureMapping<T>[]) => T;
}
declare module "core/script" {
    import { ITask, TaskContext } from "core/task";
    export function script(func: (context: TaskContext) => void): ITask;
    export function script(name: string, func: (context: TaskContext) => void): ITask;
}
declare module "core/ok" {
    import { ITask } from "core/task";
    export function ok(message: string): ITask;
    export function ok(): ITask;
}
declare module "core/delay" {
    import { ITask } from "core/task";
    export function delay(ms: number, taskfunc: () => ITask): ITask;
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
    export function dowhile(condition: ResolveFunction<boolean>, taskfunc: () => ITask): ITask;
}
declare module "core/fail" {
    import { ITask } from "core/task";
    export function fail(message: string): ITask;
    export function fail(): ITask;
}
declare module "core/ifelse" {
    import { ITask } from "core/task";
    export interface NextFunction<T> {
        (value: T): void;
    }
    export interface ResolveFunction<T> {
        (next: NextFunction<T>): void;
    }
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
    export function ifthen(condition: ResolveFunction<boolean>, task: () => ITask): ITask;
}
declare module "core/parallel" {
    import { ITask } from "core/task";
    export function parallel(tasks: Array<ITask>): ITask;
}
declare module "core/repeat" {
    import { ITask } from "core/task";
    export function repeat(iterations: number, taskfunc: (iteration: number) => ITask): ITask;
}
declare module "core/retry" {
    import { ITask } from "core/task";
    export function retry(retries: number, taskfunc: (iteration: number) => ITask): ITask;
}
declare module "core/series" {
    import { ITask } from "core/task";
    export function series(tasks: Array<ITask>): ITask;
}
declare module "core/timeout" {
    import { ITask } from "core/task";
    export function timeout(ms: number, taskfunc: () => ITask): ITask;
}
declare module "core/trycatch" {
    import { ITask } from "core/task";
    export function trycatch(left: () => ITask, right: () => ITask): ITask;
}
declare module "node/append" {
    import { ITask } from "core/task";
    export function append(target: string, content: string): ITask;
}
declare module "node/cli" {
    import { ITask } from "core/task";
    export const cli: (argv: string[], tasks: {
        [taskname: string]: ITask;
    }) => ITask;
}
declare module "node/concat" {
    import { ITask } from "core/task";
    export function concat(outputFile: string, sources: string[]): ITask;
}
declare module "node/fsutil" {
    import * as fs from "fs";
    export const message: (context: string, args: string[]) => string;
    export const error: (context: string, message: string, path: string) => Error;
    export interface Meta {
        type: "invalid" | "empty" | "file" | "directory";
        basename: string;
        dirname: string;
        relname: string;
        stat: fs.Stats;
    }
    export const meta: (src: string) => Meta;
    export const tree: (src: string) => Meta[];
    export const build_directory: (directory: string) => void;
    export const copy_file: (src: string, dst: string) => void;
}
declare module "node/copy" {
    import { ITask } from "core/task";
    export function copy(source_file_or_directory: string, target_directory: string): ITask;
}
declare module "node/drop" {
    import { ITask } from "core/task";
    export function drop(drop_file_or_directory: string): ITask;
}
declare module "node/serve" {
    import { ITask } from "core/task";
    export function serve(directory: string, port: number, watch: boolean, delay: number): ITask;
    export function serve(directory: string, port: number, watch: boolean): ITask;
    export function serve(directory: string, port: number): ITask;
}
declare module "node/shell" {
    import { ITask } from "core/task";
    export function shell(command: string, exitcode: number): ITask;
    export function shell(command: string): ITask;
}
declare module "node/watch" {
    import { ITask } from "core/task";
    export function watch(paths: string[], delay: number, immediate: boolean, taskfunc: () => ITask): ITask;
    export function watch(paths: string[], delay: number, taskfunc: () => ITask): ITask;
    export function watch(paths: string[], taskfunc: () => ITask): ITask;
    export function watch(path: string, delay: number, immediate: boolean, taskfunc: () => ITask): ITask;
    export function watch(path: string, delay: number, taskfunc: () => ITask): ITask;
    export function watch(path: string, taskfunc: () => ITask): ITask;
}
declare module "tasksmith-node" {
    import { debug } from "core/debug";
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
    import { append } from "node/append";
    import { cli } from "node/cli";
    import { concat } from "node/concat";
    import { copy } from "node/copy";
    import { drop } from "node/drop";
    import { serve } from "node/serve";
    import { shell } from "node/shell";
    import { watch } from "node/watch";
    export { debug, delay, dowhile, fail, format, ifelse, ifthen, ok, parallel, repeat, retry, script, series, ITask, Task, TaskEvent, timeout, trycatch, append, cli, concat, copy, drop, serve, shell, watch };
}
