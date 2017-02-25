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

export interface Context {
  log    (data: string)      : void
  fail   (reason?: string)   : void
  abort  (func   : Function) : void
  ok     ()                  : void
}

/**
 * TaskContext: A context passed into a task for fulfillment.
 */
export class TaskContext implements Context {
  private _completed : boolean
  private _cancelled : boolean
  private _abort     : Function

  /**
   * creates a new task context.
   * @param {Function} _resolve the external resolve function.
   * @param {Function} _reject  the external reject function.
   * @param {Function} _log the external log function.
   * @returns {TaskContext}
   */
  constructor(private _resolve : () => void,
              private _reject  : (reason? : string) => void,
              private _log     : (data    : string) => void) {
    
    this._completed = false
    this._cancelled = false
    this._abort     = function() {}
  }

  /**
   * logs data for this context.
   * @param {string} data the data to log.
   * @returns {void}
   */
  public log(data: string): void {
    if(this._completed === false) {
      this._log(data)
    }
  }

  /**
   * completes this task, marking its state as completed.
   * @returns {void}
   */
  public ok(): void {
    if(this._completed === false) {
      this._completed = true
      this._resolve()
      this._abort()
    }
  }

  /**
   * fails this task, marking its state as completed.
   * @param {string} reason the reason for this failer.
   * @returns {void}
   */
  public fail(reason?: string): void {
    if(this._completed === false) {
      this._completed = true
      this._reject(reason)
      this._abort()
    }
  }

  /**
   * signals this context for canellation.
   * @returns {void}
   */
  public cancel() : void {
    if(this._cancelled === false) {
      this._cancelled = true
      this._abort()
    }
  }

  /**
   * registers this function to listen for canellation.
   * @returns {void}
   */
  public abort(func: Function): void {
    this._abort = func
  }
}

export class Task {
  private _context   : TaskContext
  private _state     : "pending" | "running" | "ok" | "fail"
  private _cancelled : boolean
  
  /**
   * creates a new task.
   * @param {TaskFunction} func the task execution function.
   * @returns {Task}
   */
  constructor(private func: (context: Context) => void) {
    this._state     = "pending"
    this._cancelled = false
  }

  /**
   * runs this task with a optional logging function.
   * @param {Function} log optional log function.
   * @returns {Promise<any>}
   */
  public run(log: (data: string) => void = (data: string) => { }): Promise<string> {
    if(this._cancelled === true) {
      return Promise.reject<string>("this task has been cancelled prior to commencement.")
    } else {
      switch(this._state) {
        case "ok":
        case "fail":
        case "running":
          return Promise.reject<string>("cannot run task in non pending state.")
        case "pending":
          return new Promise<string>((resolve, reject) => {
            this._state   = "running"
            this._context = new TaskContext (
              ()   => { this._state = "ok";   resolve ()     },
              data => { this._state = "fail"; reject  (data) },
              data => { log(data) }
            )
            this.func(this._context)
          })
      }
    }
  }

  /**
   * sends a cancellation signal to this task. note that this
   * task may choose to honor the cancellation, or ignore it. 
   * internally, this raises the tasks abort() handler.
   * @returns {void}
   */
  public cancel(): void {
    if(this._cancelled === false) {
      this._cancelled = true
      switch(this._state) {
        case "ok":
        case "fail":
        case "pending":
          break;
        case "running":
          this._context.cancel()
          break;
      }
    }
  }
}