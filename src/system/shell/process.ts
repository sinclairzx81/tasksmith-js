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

import * as child_process from "child_process"
import * as events        from "events"

export class Process {
  private events   : events.EventEmitter
  private encoding : string
  private child    : child_process.ChildProcess
  private windows  : boolean
  private running  : boolean

  /**
   * creates a new process with the given command.
   * @param {string} the shell command.
   * @returns {Process} 
   */
  constructor(private command: string) {
    this.events   = new events.EventEmitter()
    this.encoding = "utf8"
    this.windows  = /^win/.test(process.platform) as boolean
    this.running  = true

    this.child = child_process.spawn(
      this.windows ? 'cmd' : 'sh',
      [this.windows ? '/c' : '-c', this.command]
    )
    this.child.stdout.setEncoding(this.encoding)
    this.child.stderr.setEncoding(this.encoding)
    this.child.stdout.on("data", data => {
      if(this.running) {
         this.events.emit("data", data)
      }
    })
    this.child.stderr.on("data", data => {
      if(this.running) {
         this.events.emit("data", data)
      }
    })
    this.child.on("close", () => this.dispose())
    this.child.on("exit", (code, signal) => {
      if(this.running) {
        this.running = false
        this.events.emit("end", code)
      }
    })
  }

  /**
   * subscribes to data received on this process.
   * @param {string} event the event to subscribe to.
   * @param {Function} func the event listener
   * @param {Process}
   */
  public on(event:'data', func: (data: any) => void): Process

  /**
   * subscribes to end events from this process.
   * @param {string} event the event to subscribe to.
   * @param {Function} func the event listener
   * @param {Process}
   */
  public on(event:'end', func: (exitcode: number) => void): Process

  /**
   * subscribes to events on this process.
   * @param {string} event the event to subscribe to.
   * @param {Function} func the event listener
   * @param {Process}
   */
  public on(event: string, func: Function): Process {
    this.events.on(event, func)
    return this
  }

  /**
   * disposes of this process.
   * @returns {void}
   */
  public dispose(): void {
    if(this.running) {
      if (this.windows === true) {
        child_process.exec('taskkill /pid ' + this.child.pid + ' /T /F')
      } else {
        this.child.kill("SIGINT")
      }
    }
  }
}