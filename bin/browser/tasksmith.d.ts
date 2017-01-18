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
declare module "tasksmith-browser" {
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
    export { debug, delay, dowhile, fail, format, ifelse, ifthen, ok, parallel, repeat, retry, run, script, series, ITask, Task, TaskEvent, timeout, trycatch };
}
