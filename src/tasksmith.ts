/*--------------------------------------------------------------------------

tasksmith - minimal task automation library for node.

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

/// <reference path="typings/node/node.d.ts" />

// common modules.
import {signature}              from "./common/signature"
import {tabulate}               from "./common/tabulate"

// core modules.
import {delay}                  from "./core/delay"
import {dowhile}                from "./core/dowhile"
import {fail}                   from "./core/fail"
import {format}                 from "./core/format"
import {ifelse}                 from "./core/ifelse"
import {ifthen}                 from "./core/ifthen"
import {ok}                     from "./core/ok"
import {parallel}               from "./core/parallel"
import {repeat}                 from "./core/repeat"
import {script}                 from "./core/script"
import {series}                 from "./core/series"
import {ITask, Task, TaskEvent} from "./core/task"
import {timeout}                from "./core/timeout"
import {trycatch}               from "./core/trycatch"

// node modules
import {append}                 from "./node/fs/append"
import {concat}                 from "./node/fs/concat"
import {copy}                   from "./node/fs/copy"
import {drop}                   from "./node/fs/drop"
import {watch}                  from "./node/watch"
import {cli}                    from "./node/cli"
import {shell}                  from "./node/shell"

export {
  /** common modules */
  signature,
  tabulate,

  /** core modules */
  delay,
  dowhile,
  ifelse,
  parallel,
  repeat,
  script,
  series,
  ITask, Task, TaskEvent,
  timeout,
  trycatch,

  /** node modules */
  append,
  concat,
  copy,
  drop,
  watch,
  cli,
  shell
}