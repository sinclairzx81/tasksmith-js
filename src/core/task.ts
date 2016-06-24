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

/** TaskEvent: The interface for events emitted from Tasks in flight. */
export interface TaskEvent {
  id   : string
  task : string 
  time : Date
  type : "start" | "log" | "ok" | "fail"
  data : string
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
  run(): Promise<string>
}

/** State: internal state of a task.  */
export type State = "pending"
                  | "running"
                  | "completed"
                  | "failed"

/** Task: encapulates a unit of work. */
export class Task implements ITask {

  private subscribers: Array<(event: TaskEvent) => void>
  private state      : State
  private id         : string

  /**
   * creates a new task.
   * @param {string} the identity of this task.
   * @param {string} the name of this task.
   * @param {Function} a callback to handle this task.
   * @returns {Task}
   */
  constructor(private name: string, private func: (id: string, emit: (event: TaskEvent) => void) => void) { 
    this.subscribers = new Array<(event: TaskEvent) => void>()
    this.state       = "pending"
    this.id          = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    })
  }
  
  /**
   * subscribes to any events emitted from this task.
   * @param {Function} a function to receive events.
   * @returns {ITask}
   */
  public subscribe(subscriber: (event: TaskEvent) => void) : ITask {
    this.subscribers.push(subscriber)
    return this
  }
  
  /**
   * Starts this task and returns a Promise on completion.
   * @returns {PromiseLike<any>}
   */
  public run(): Promise<string> {
    if(this.state !== "pending") {
      return new Promise<string>((_, reject) => reject("this task has already started."))
    } else {
      return new Promise<string>((resolve, reject) => {
        try {
          this.state = "running"
          this.subscribers.forEach(subscriber => subscriber({
            id  : this.id,
            task: this.name,
            time: new Date(),
            type: "start",
            data: ""
          }))
          this.func(this.id, event => {
            switch(event.type) {
              case "start":
                if(this.state === "running") {
                  this.subscribers.forEach(subscriber => subscriber(event))
                }
                break;
              case "log":
                if(this.state === "running") {
                  this.subscribers.forEach(subscriber => subscriber(event))
                }
                break;
              case "ok":
               if(this.state === "running") {
                 this.subscribers.forEach(subscriber => subscriber(event))
                  if(event.id === this.id) {
                    this.state = "completed"
                    resolve(event.data)
                  }
                }
                break;
              case "fail":
                if(this.state === "running") {
                  this.subscribers.forEach(subscriber => subscriber(event))
                  if(event.id === this.id) {
                    this.state = "failed"
                    reject(event.data)
                  }
                }
                break;
            }
          })
        } catch(error) {
          if(this.state === "running") {
            this.state = "failed"
            this.subscribers.forEach(subscriber => subscriber({
              id  : this.id,
              task: this.name,
              time: new Date(),
              type: "fail",
              data: error.message
            })); reject(error)
          }
        }
      })
    }
  }
}