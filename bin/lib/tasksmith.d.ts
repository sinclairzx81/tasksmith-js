/// <reference path="../../src/typings/node.d.ts" />
declare module "core/task" {
    export interface Context {
        log(data: string): void;
        fail(reason?: string): void;
        abort(func: Function): void;
        ok(): void;
    }
    export class TaskContext implements Context {
        private _resolve;
        private _reject;
        private _log;
        private _completed;
        private _cancelled;
        private _abort;
        constructor(_resolve: () => void, _reject: (reason?: string) => void, _log: (data: string) => void);
        log(data: string): void;
        ok(): void;
        fail(reason?: string): void;
        cancel(): void;
        abort(func: Function): void;
    }
    export class Task {
        private func;
        private _context;
        private _state;
        private _cancelled;
        constructor(func: (context: Context) => void);
        run(log?: (data: string) => void): Promise<string>;
        cancel(): void;
    }
}
declare module "common/signature" {
    export type TypeName = "undefined" | "null" | "function" | "string" | "number" | "boolean" | "date" | "array" | "object" | "regex";
    export const reflect: (obj: any) => TypeName;
    export const compare_type: (left: string, right: string) => boolean;
    export const compare_type_array: (left: string[], right: string[]) => boolean;
    export interface Mapping {
        typenames: Array<string>;
        func: (...args: any[]) => Array<any>;
    }
    export interface ErrorFunc {
        (error: any): void;
    }
    export class Signature {
        private args;
        private mappings;
        private errorfuncs;
        constructor(args: Array<any>);
        map(typenames: Array<string>, func?: (...args: Array<any>) => Array<any>): Signature;
        err(func: (error: any) => void): Signature;
        run(func: (...args: Array<any>) => any): any;
        private raiseError();
    }
    export function signature(args: Array<any>): Signature;
}
declare module "core/create" {
    import { Context, Task } from "core/task";
    export function create(name: string, func: (context: Context) => void): Task;
    export function create(func: (context: Context) => void): Task;
}
declare module "core/cli" {
    import { Task } from "core/task";
    export interface TaskOptions {
        [name: string]: Task;
    }
    export function cli<T>(argv: Array<string>, options: TaskOptions): Task;
}
declare module "core/debug" {
    export function debug(data: string): void;
}
declare module "core/fail" {
    import { Task } from "core/task";
    export const fail: (message?: string) => Task;
}
declare module "core/delay" {
    import { Task } from "core/task";
    export function delay(ms: number, task: Task): Task;
    export function delay(ms: number): Task;
}
declare module "core/noop" {
    import { Task } from "core/task";
    export const noop: () => Task;
}
declare module "core/each" {
    import { Task } from "core/task";
    export function each<T>(elements: Array<T>, func: (element: T) => Task): Task;
}
declare module "core/ifelse" {
    import { Task } from "core/task";
    export function ifelse(condition: boolean, ifTask: Task, elseTask: Task): Task;
    export function ifelse(condition: boolean, ifTask: Task): Task;
}
declare module "core/ok" {
    import { Task } from "core/task";
    export const ok: () => Task;
}
declare module "core/parallel" {
    import { Task } from "core/task";
    export function parallel(tasks: Array<Task>): Task;
}
declare module "core/repeat" {
    import { Task } from "core/task";
    export function repeat(iterations: number, func: () => Task): Task;
}
declare module "core/retry" {
    import { Task } from "core/task";
    export function retry(retries: number, func: () => Task): Task;
}
declare module "core/series" {
    import { Task } from "core/task";
    export function series(tasks: Array<Task>): Task;
}
declare module "system/shell/process" {
    export class Process {
        private command;
        private events;
        private encoding;
        private child;
        private windows;
        private running;
        constructor(command: string);
        on(event: 'data', func: (data: any) => void): Process;
        on(event: 'end', func: (exitcode: number) => void): Process;
        dispose(): void;
    }
}
declare module "core/shell" {
    import { Task } from "core/task";
    export function shell(command: string, exitcode: number): Task;
    export function shell(command: string): Task;
}
declare module "core/timeout" {
    import { Task } from "core/task";
    export function timeout(ms: number, task: Task): Task;
}
declare module "core/trycatch" {
    import { Task } from "core/task";
    export function trycatch(tryTask: Task, catchTask: Task): Task;
    export function trycatch(tryTask: Task): Task;
}
declare module "core/watch" {
    import { Task } from "core/task";
    export function watch(target: string, func: () => Task): Task;
}
declare module "system/folder/scan" {
    import * as fs from "fs";
    export interface DirectoryEntry {
        type: "directory";
        fullname: string;
        dirname: string;
        basename: string;
        stats: fs.Stats;
    }
    export interface FileEntry {
        type: "file";
        fullname: string;
        dirname: string;
        basename: string;
        stats: fs.Stats;
    }
    export interface NullEntry {
        type: "null";
        fullname: string;
        dirname: string;
        basename: string;
    }
    export type Entry = DirectoryEntry | FileEntry | NullEntry;
    export function scan_entry(filepath: string): Entry;
    export function scan_entries(directory: string): Array<Entry>;
    export function scan_entries_recurisve(directory: string): Array<Entry>;
}
declare module "system/folder/create" {
    import { Entry } from "system/folder/scan";
    export function create_stack(target: string): Array<Entry>;
    export function create(target: string, log?: Function): void;
}
declare module "system/file/copy" {
    export function copy(source: string, target: string, log?: Function): void;
    export function copyTo(source: string, directory: string, log?: Function): void;
}
declare module "system/folder/copy" {
    import { Entry } from "system/folder/scan";
    export interface CopyOperation {
        fromEntry: Entry;
        toEntry: Entry;
    }
    export function copy_stack(source: string, target: string): Array<CopyOperation>;
    export function copy(source: string, target: string, log?: Function): void;
}
declare module "system/folder/merge" {
    import { Entry } from "system/folder/scan";
    export interface MergeOperation {
        fromEntry: Entry;
        toEntry: Entry;
    }
    export function merge_stack(source: string, target: string): Array<MergeOperation>;
    export function merge(source: string, target: string, log?: Function): void;
}
declare module "system/folder/drop" {
    import { Entry } from "system/folder/scan";
    export function drop_stack(directory: string): Array<Entry>;
    export function drop(target: string, log?: Function): void;
}
declare module "system/folder/rename" {
    export function rename(directory: string, newname: string, log?: Function): void;
}
declare module "system/folder/move" {
    export function move(source: string, target: string, log?: Function): void;
}
declare module "system/folder/index" {
    import { scan_entry, scan_entries, scan_entries_recurisve } from "system/folder/scan";
    import { create } from "system/folder/create";
    import { copy } from "system/folder/copy";
    import { merge } from "system/folder/merge";
    import { drop } from "system/folder/drop";
    import { rename } from "system/folder/rename";
    import { move } from "system/folder/move";
    export { scan_entry, scan_entries, scan_entries_recurisve, create, copy, merge, drop, rename, move };
}
declare module "system/file/append" {
    export function append(target: string, content?: string, log?: Function): void;
}
declare module "system/file/read" {
    export function read(target: string, encoding?: string, log?: Function): string | Buffer;
}
declare module "system/file/concat" {
    export function concat(target: string, sources: Array<string>, seperator?: string, log?: Function): void;
}
declare module "system/file/create" {
    export function create(target: string, content?: string, log?: Function): void;
}
declare module "system/file/drop" {
    export function drop(target: string, log?: Function): void;
}
declare module "system/file/move" {
    export function move(target: string, directory: string, log?: Function): void;
}
declare module "system/file/rename" {
    export function rename(target: string, newname: string, log?: Function): void;
}
declare module "system/file/replaceText" {
    export function replaceText(target: string, token: string, replacement: string, log?: Function): void;
}
declare module "system/file/truncate" {
    export function truncate(target: string, content?: string, log?: Function): void;
}
declare module "system/file/index" {
    import { append } from "system/file/append";
    import { concat } from "system/file/concat";
    import { copy, copyTo } from "system/file/copy";
    import { create } from "system/file/create";
    import { drop } from "system/file/drop";
    import { move } from "system/file/move";
    import { read } from "system/file/read";
    import { rename } from "system/file/rename";
    import { replaceText } from "system/file/replaceText";
    import { truncate } from "system/file/truncate";
    export { append, copy, copyTo, concat, create, drop, move, read, rename, replaceText, truncate };
}
declare module "system/http/get" {
    export function get(endpoint: string): Promise<string>;
}
declare module "system/http/index" {
    import { get } from "system/http/get";
    export { get };
}
declare module "system/shell/index" {
    import { Process } from "system/shell/process";
    export { Process };
}
declare module "system/index" {
    import * as folder from "system/folder/index";
    import * as file from "system/file/index";
    import * as http from "system/http/index";
    import * as shell from "system/shell/index";
    export { folder, file, http, shell };
}
declare module "folder/copy" {
    import { Task } from "core/task";
    export function copy(source: string, target: string): Task;
}
declare module "folder/create" {
    import { Task } from "core/task";
    export function create(target: string): Task;
}
declare module "folder/drop" {
    import { Task } from "core/task";
    export function drop(target: string): Task;
}
declare module "folder/merge" {
    import { Task } from "core/task";
    export function merge(source: string, target: string): Task;
}
declare module "folder/move" {
    import { Task } from "core/task";
    export function move(source: string, target: string): Task;
}
declare module "folder/rename" {
    import { Task } from "core/task";
    export function rename(target: string, newname: string): Task;
}
declare module "folder/index" {
    import { copy } from "folder/copy";
    import { create } from "folder/create";
    import { drop } from "folder/drop";
    import { merge } from "folder/merge";
    import { move } from "folder/move";
    import { rename } from "folder/rename";
    export { copy, create, drop, merge, move, rename };
}
declare module "file/append" {
    import { Task } from "core/task";
    export function append(target: string, content: string): Task;
}
declare module "file/concat" {
    import { Task } from "core/task";
    export function concat(target: string, sources: string, seperator: string): Task;
    export function concat(target: string, sources: string): Task;
}
declare module "file/copy" {
    import { Task } from "core/task";
    export function copy(source: string, target: string): Task;
}
declare module "file/create" {
    import { Task } from "core/task";
    export function create(target: string, content: string): Task;
    export function create(target: string): Task;
}
declare module "file/drop" {
    import { Task } from "core/task";
    export function drop(target: string): Task;
}
declare module "file/move" {
    import { Task } from "core/task";
    export function move(target: string, directory: string): Task;
}
declare module "file/read" {
    import { Task } from "core/task";
    export function read(target: string, func: (content: string) => Task): Task;
}
declare module "file/rename" {
    import { Task } from "core/task";
    export function rename(target: string, newname: string): Task;
}
declare module "file/replaceText" {
    import { Task } from "core/task";
    export function replaceText(target: string, token: string, replacement: string): Task;
}
declare module "file/truncate" {
    import { Task } from "core/task";
    export function truncate(target: string, content: string): Task;
    export function truncate(target: string): Task;
}
declare module "file/index" {
    import { append } from "file/append";
    import { concat } from "file/concat";
    import { copy } from "file/copy";
    import { create } from "file/create";
    import { drop } from "file/drop";
    import { move } from "file/move";
    import { read } from "file/read";
    import { rename } from "file/rename";
    import { replaceText } from "file/replaceText";
    import { truncate } from "file/truncate";
    export { append, concat, copy, create, drop, move, read, rename, replaceText, truncate };
}
declare module "http/get" {
    import { Task } from "core/task";
    export function get(endpoint: string, func: (content: string) => Task): Task;
}
declare module "http/index" {
    import { get } from "http/get";
    export { get };
}
declare module "index" {
    import { Task } from "core/task";
    import { cli } from "core/cli";
    import { create } from "core/create";
    import { debug } from "core/debug";
    import { fail } from "core/fail";
    import { delay } from "core/delay";
    import { each } from "core/each";
    import { ifelse } from "core/ifelse";
    import { ok } from "core/ok";
    import { parallel } from "core/parallel";
    import { repeat } from "core/repeat";
    import { retry } from "core/retry";
    import { series } from "core/series";
    import { shell } from "core/shell";
    import { timeout } from "core/timeout";
    import { trycatch } from "core/trycatch";
    import { watch } from "core/watch";
    import * as system from "system/index";
    import * as folder from "folder/index";
    import * as file from "file/index";
    import * as http from "http/index";
    export { Task, cli, create, debug, fail, delay, each, ifelse, ok, parallel, repeat, retry, series, shell, timeout, trycatch, watch, system, folder, file, http };
}
