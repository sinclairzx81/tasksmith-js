/// <reference path="../../src/node/node.d.ts" />
declare module "core/task" {
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
    export interface ParallelFunc {
        (): Array<ITask>;
    }
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
declare module "core/run" {
    import { ITask } from "core/task";
    export const run: (task: ITask) => Promise<string>;
}
declare module "core/series" {
    import { ITask } from "core/task";
    export interface SeriesFunc {
        (): Array<ITask>;
    }
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
declare module "node/util" {
    import * as fs from "fs";
    export function error(context: string, message: string, path: string): Error;
    export interface StatExtended {
        type: "invalid" | "not-found" | "file" | "directory";
        basename: string;
        dirname: string;
        relname: string;
        stat: fs.Stats;
    }
    export const meta: (src: string) => StatExtended;
    export function tree(src: string): StatExtended[];
    export function mkdir(directory: string, log?: (message: string) => void): void;
    export function touch(filepath: string, log?: (message: string) => void): void;
    export function copy_file(src: string, dst: string, log?: (message: string) => void): void;
    export function copy(src: string, directory: string, log: (message: string) => void): void;
    export function drop(target: string, log?: (message: string) => void): void;
    export function append(target: string, content: string, log?: (message: string) => void): void;
    export function concat(target: string, sources: string[], log?: (message: string) => void): void;
    export function download(uri: string, filepath: string, log?: (message: string) => void): Promise<any>;
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
    export function concat(output: string, sources: string[]): ITask;
}
declare module "node/copy" {
    import { ITask } from "core/task";
    export function copy(source: string, target: string): ITask;
}
declare module "node/download" {
    import { ITask } from "core/task";
    export function download(uri: string, filepath: string): ITask;
}
declare module "node/drop" {
    import { ITask } from "core/task";
    export function drop(target: string): ITask;
}
declare module "node/mkdir" {
    import { ITask } from "core/task";
    export function mkdir(target: string): ITask;
}
declare module "node/shell" {
    import { ITask } from "core/task";
    export function shell(command: string, exitcode: number): ITask;
    export function shell(command: string): ITask;
}
declare module "node/touch" {
    import { ITask } from "core/task";
    export function touch(filename: string): ITask;
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
    import { run } from "core/run";
    import { script } from "core/script";
    import { series } from "core/series";
    import { ITask, Task, TaskEvent } from "core/task";
    import { timeout } from "core/timeout";
    import { trycatch } from "core/trycatch";
    import { append } from "node/append";
    import { cli } from "node/cli";
    import { concat } from "node/concat";
    import { copy } from "node/copy";
    import { download } from "node/download";
    import { drop } from "node/drop";
    import { mkdir } from "node/mkdir";
    import { shell } from "node/shell";
    import { touch } from "node/touch";
    import { watch } from "node/watch";
    export { debug, delay, dowhile, fail, format, ifelse, ifthen, ok, parallel, repeat, retry, run, script, series, ITask, Task, TaskEvent, timeout, trycatch, append, cli, concat, copy, download, drop, mkdir, shell, touch, watch };
}
