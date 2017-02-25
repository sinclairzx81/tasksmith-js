/*--------------------------------------------------------------------------

tasksmith - task automation library for node.

The MIT License (MIT)

Copyright (c) 2015-2017 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

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

/// <reference path="./typings/node.d.ts" />

import {Task}          from "./core/task"
import {cli}           from "./core/cli"
import {create}        from "./core/create"
import {debug}         from "./core/debug"
import {fail}          from "./core/fail"
import {delay}         from "./core/delay"
import {each}          from "./core/each"
import {ifelse}        from "./core/ifelse"
import {ok}            from "./core/ok"
import {parallel}      from "./core/parallel"
import {repeat}        from "./core/repeat"
import {retry}         from "./core/retry"
import {series}        from "./core/series"
import {shell}         from "./core/shell"
import {timeout}       from "./core/timeout"
import {trycatch}      from "./core/trycatch"
import {watch}         from "./core/watch"
import * as system     from "./system/index"
import * as folder     from "./folder/index"
import * as file       from "./file/index"
import * as http       from "./http/index"

export {
  Task,
  cli,
  create,
  debug,
  fail,
  delay,
  each,
  ifelse,
  ok,
  parallel,
  repeat,
  retry,
  series,
  shell,
  timeout,
  trycatch,
  watch,
  system,
  folder,
  file,
  http,
}