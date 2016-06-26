/*--------------------------------------------------------------------------

tasksmith - task automation library for node.

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

import {Promise} from "../common/promise"


const format_arguments = (args: any[]) : string => {
  if(args === null || args === undefined) return ""
  if(Array.isArray(args)   === false)     return ""
  let buffer = []
  for(let i = 0; i < args.length; i++) {
    if(args[i] === null || args[i] === undefined) continue;
    let str = args[i].toString()
    if(str.length === 0) continue;
    buffer.push(str)
  }
  return (buffer.length === 1) 
    ? buffer[0]
    : buffer.join(' ') 
}


/**
 * TaskCancellation:
 * 
 * A task cancellation token. Can optionally be
 * passed to tasks at creation, otherwise, an internal
 * cancellation object will be created. 
 */
export class TaskCancellation {
  private state      : "active" | "cancelled"
  private subscribers: Function[]
  
  /**
   * creates a new task cancel.
   * @returns {TaskCancel}
   */
  constructor() {
    this.state       = "active"
    this.subscribers = []
  }
  /**
   * subscribes to cancellation events.
   * @param {(reason: string) => void} a function to receive cancellations.
   * @returns {void}
   */
  public subscribe(func: (reason: string) => void) : void {
    if(this.state === "cancelled") throw Error("cannot subscribe to a task cancel that has already been cancelled.")
    this.subscribers.push(func)
  }
  /**
   * emits a cancellation signal to subscribers and marks this state as cancelled.
   * @param {string} the reason why this task was cancelled.
   * @returns {void}
   */
  public cancel(reason: string) : void {
    if(this.state === "cancelled") throw Error("cannot cancel a task more than once.")
    this.subscribers.forEach(subscriber => subscriber(reason))
    this.subscribers = []
    this.state       = "cancelled"
  }
}

/**
 * TaskEvent:
 * 
 * As tasks execute, they emit events. Examples
 * include state transitions, logging and the 
 * end state of the task.
 */
export interface TaskEvent {
  /** the unique identity of this task. */
  id   : string
  /** the name given to this task */
  name : string 
  /** the time in which this event was created. */
  time : Date
  /** the type of event being emitted. */
  type : string
  /** any data associated with this event. */
  data : string
}

/**
 * TaskState:
 * 
 * The allowable states a task can be in.
 */
export type TaskState = "pending" 
                      | "started" 
                      | "completed" 
                      | "failed" 
                      | "cancelled"
/**
 * TaskExecutor:
 * 
 * Similar to a promise executor, given to
 * tasks to ok() or fail() the task with 
 * logging method.
 */
export interface TaskExecutor {
  (context: TaskContext) : void
}

/**
 * TaskContext:
 * 
 * Given to executing tasks.
 */
export interface TaskContext {

  /**
   * emits this event to any subscribers.
   * @param {TaskEvent} the event to emit.
   * @returns {void}
   */
  emit    : ( event: TaskEvent) => void

  /**
   * logs a message for this task context.
   * @param {...args:any[]} the arguments to log.
   * @returns {void}
   */
  log      : ( ...args: any[]) => void

  /**
   * sets this task as completed.
   * @param {...args:any[]} the arguments to log.
   * @returns {void}
   */
  ok       : ( ...args: any[]) => void

  /**
   * sets this task as failed.
   * @param {string} the reason why this task has failed.
   * @returns {void}
   */
  fail     : ( ...args: any[]) => void

  /**
   * a callback the inner context and listen on for external
   * cancellation of this task.
   * @param {(reason: string) => void} a function to receive the cancellation reason.
   * @returns {void}
   */
  oncancel : (func: ( ...args: any[]) => void) => void
}


export interface ITask {

  /**
   * subscribes to any events emitted from this task.
   * @param {Function} a function to receive events.
   * @returns {ITask}
   */
  subscribe(func: (event: TaskEvent) => void): ITask


  /**
   * runs this task.
   * @returns {void}
   */
  run() : Promise<string>

  /**
   * runs this task.
   * @returns {void}
   */
  cancel(reason?: string): void
}

/**
 * Task: 
 * 
 * encapsulates a unit of work.
 */
export class Task implements ITask {
  private subscribers  : { (event: TaskEvent):void }[]
  private task_id         : string
  private task_name       : string
  private task_state      : TaskState
  private task_executor   : TaskExecutor
  private task_cancellor  : TaskCancellation

  /**
   * creates a new task.
   * @param {TaskExecutor} the task executor function.
   * @param {TaskCancellation} an optional task cancellation token.
   * @returns {Task<T>}
   */
  constructor(name: string, task_executor : TaskExecutor, task_cancellor?: TaskCancellation) {
    this.subscribers     = []
    this.task_state      = "pending"
    this.task_executor   = task_executor
    this.task_cancellor  = task_cancellor || new TaskCancellation()
    this.task_name       = name
    this.task_id         = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    })
  }

  /**
   * starts this task.
   * @returns {Promise<string>}
   */
  public run() : Promise<string> {
    return new Promise<string>((resolve, reject) => {
      /**
       * started:
       * 
       * tasks are only run once a caller has
       * invoked the tasks run function, in this
       * case, we emit a started event to any
       * subscribers and transision the state.
       */
      this.task_state = "started"
      this._notify ({
        id   : this.task_id,
        name : this.task_name,
        time : new Date(),
        type : "started",
        data : ""
      })

      /**
       * executor: do i want to defer this?
       * 
       * Here we pass the executor function a
       * task context for it to resolve this
       * tasks internal promise. In addition,
       * we listen out for any content calls
       * and dispatch events for each.
       */
      this.task_executor({

        /**
         * log:
         * 
         * the executor may opt to emit messages out, we 
         * pass these off to subscribers to listen 
         * to.
         */
        log: (...args: any[]) => {
          if(this.task_state === "started") {
            this._notify ({
              id   : this.task_id,
              name : this.task_name,
              time : new Date(),
              type : "log",
              data : format_arguments(args)
            })
          }
        },

        /**
         * emit:
         * 
         * when executing, the task may need to
         * emit events on behalf of inner tasks.
         * The executor may subscribe on the inner
         * task and emit the inner tasks events 
         * with this function.
         */
        emit: (event: TaskEvent) => {
          if(this.task_state === "started") {
            this._notify (event)
          }
        },

        /**
         * ok:
         * 
         * on ok, we set the state to completed
         * resolve the inner promise and 
         * emit a completed event to subscribers.
         */
        ok : (...args: any[]) => {
          if(this.task_state === "started") {
            this.task_state = "completed"
            this._notify ({
              id   : this.task_id,
              name : this.task_name,
              time : new Date(),
              type : "completed",
              data : format_arguments(args)
            })
            resolve(format_arguments(args))
          }
        },
        /**
         * fail:
         * 
         * on fail, we set the state to failed,
         * reject the inner promise and 
         * emit a failed event to subscribers.
         */
        fail: (...args: any[]) => {
          if(this.task_state === "started") {
            this.task_state = "failed"
            this._notify ({
              id   : this.task_id,
              name : this.task_name,
              time : new Date(),
              type : "failed",
              data : format_arguments(args)
            })
            reject(format_arguments(args))
          }
        },
        /**
         * oncancel:
         * 
         * cancellation of tasks is not handled
         * by the task itself, rather, its pushed
         * into the tasks executor to handle 
         * accordingly. Here, we register this function
         * against the tasks cancellor.
         */
        oncancel : (func) => {
          if(this.task_state === "started") {
            this.task_cancellor.subscribe(func)
          }
        }
      })
    })    
  }

  /**
   * cancels this task, immediately rejecting the task.
   * @param {string} the reason for cancellation.
   * @returns {void}
   */
  public cancel(reason?: string) : void {
    if(this.task_state === "started")
      this.task_cancellor.cancel(reason || "")
  }

  /**
   * subscribes to any events emitted from this task.
   * @param {(event: TaskEvent) => void} the function to subscribe.
   * @returns {void}
   */
  public subscribe(func: (event: TaskEvent) => void) : ITask {
    if(this.task_state !== "pending") 
      throw Error("can only subscribe to a task while in a pending state.")
    this.subscribers.push(func)
    return this
  }

  /**
   * (internal) dispatches an event to task subscribers.
   * @param {string} the type of event being emitted.
   * @param {string} (optional) any data accociated with the event.
   * @returns {void}
   */
  private _notify(event: TaskEvent) : void {
    this.subscribers.forEach(subscriber => subscriber(event))
  }
}