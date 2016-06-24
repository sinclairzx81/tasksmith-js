/*--------------------------------------------------------------------------

promise-ts - An implementation of the ES6 Promise type in typescript.

The MIT License (MIT)

Copyright (c) 2016 Haydn Paterson (sinclair) <haydn.developer@gmail.com>

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

export interface Reject       {  (reason: string | Error): void  }
export interface Resolve  <T> {  (value : T): void }
export interface Executor <T> {  (resolve: Resolve <T> , reject: Reject): void }
export interface Thenable <T> {
  /**
   * Appends fulfillment and rejection handlers to the promise, and returns a new 
   * promise resolving to the return value of the called handler, or to its original 
   * settled value if the promise was not handled (i.e. if the relevant handler 
   * onFulfilled or onRejected is undefined).
   * @param {(value: T) => U} A Function called when the Promise is fulfilled. 
   *                          This function has one argument, the fulfillment 
   *                          value.
   * @param {(reason: any| Error) => void} A Function called when the Promise is rejected.
   *                                          This function has one argument, the rejection 
   *                                          reason.
   * @returns {Thenable<T>}
   */
  then  <U> (onfulfilled: (value: T) => U | Thenable<U>, onrejected?: (reason: string | Error) => void): Thenable <U>

  /**
   * Appends a rejection handler callback to the promise, and returns a new promise 
   * resolving to the return value of the callback if it is called, or to its original 
   * fulfillment value if the promise is instead fulfilled.
   * @param {(reason: any| Error) => void} A Function called when the Promise is rejected. 
   *                                          This function has one argument, the rejection 
   *                                          reason.
   * @returns {Thenable<T>}
   */
  catch <U> (onrejected:  (reason: string | Error) => U | Thenable<U>): Thenable <U>
}
/** 
 * Promise: implementation of the ES6 promise. 
 * The Promise object is used for asynchronous computations. A Promise represents 
 * an operation that hasn't completed yet, but is expected in the future. 
 * https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise
 */
export class Promise <T> implements Thenable<T> {
  private value_callbacks: {(value: T)              : void}[]
  private error_callbacks: {(reason: string | Error): void}[]
  public state: "pending" | "fulfilled" | "rejected";
  public value: T
  public error: string | Error

  /**
   * Returns the function that created an instance's prototype. This is the Promise function by default.
   * @param {Resolver<T>} the resolver function.
   * @returns {Thenable<T>}
   */
  constructor(private executor: Executor <T>) {
    this.value_callbacks = []
    this.error_callbacks = []
    this.state = "pending"
    this.value = null
    this.error = null
    try {
      this.executor(value => this._resolve(value), 
                    error => this._reject(error))
    } catch(error) { this._reject(error) }
  }

  /**
   * Appends fulfillment and rejection handlers to the promise, and returns a new 
   * promise resolving to the return value of the called handler, or to its original 
   * settled value if the promise was not handled (i.e. if the relevant handler 
   * onFulfilled or onRejected is undefined).
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/then
   * @param {(value: T) => U} A Function called when the Promise is fulfilled. 
   *                          This function has one argument, the fulfillment 
   *                          value.
   * @param {(reason: any| Error) => void} A Function called when the Promise is rejected.
   *                                          This function has one argument, the rejection 
   *                                          reason.
   * @returns {Thenable<T>}
   */
  public then <U> (onfulfilled: (value: T) => U | Thenable<U>, onrejected?: (reason: string | Error) => void): Thenable <U> {
    return new Promise <U> ((resolve, reject) => {
      switch(this.state) {
        case "rejected":
            if(onrejected !== undefined) 
            onrejected(this.error)
            reject(this.error)
          break;
        case "fulfilled":
            let result = onfulfilled(this.value)
            if(result instanceof Promise)
            result.then(resolve).catch(reject)
            else resolve(<U>result)
          break;
        case "pending":
          this.error_callbacks.push(error => {
            if(onrejected !== undefined) 
            onrejected(error)
            reject(error)
          })
          this.value_callbacks.push(value => {
            let result = onfulfilled(value)
            if(result instanceof Promise)
            result.then(resolve).catch(reject)
            else resolve(<U>result)
          })
          break;
      }
    })
  }
  
  /**
   * Appends a rejection handler callback to the promise, and returns a new promise 
   * resolving to the return value of the callback if it is called, or to its original 
   * fulfillment value if the promise is instead fulfilled.
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/catch
   * @param {(reason: any| Error) => void} A Function called when the Promise is rejected. 
   *                                          This function has one argument, the rejection 
   *                                          reason.
   * @returns {Thenable<T>}
   */
  public catch <U> (onrejected: (reason: string | Error) => U | Thenable<U>): Thenable <U> {
    return new Promise <U> ((resolve, reject) => {
      switch(this.state) {
        case "fulfilled": break;
        case "rejected":
          let result = onrejected(this.error)
          if(result instanceof Promise)
          result.then(resolve).catch(reject)
          else resolve(<U>result)
          break;
        case "pending":
          this.error_callbacks.push(error => {
            let result = onrejected(this.error)
            if(result instanceof Promise)
            result.then(resolve).catch(reject)
            else resolve(<U>result)
          })
          break;
      }
    })
  }
  
  /**
   * Returns a promise that either resolves when all of the promises in the iterable 
   * argument have resolved or rejects as soon as one of the promises in the iterable 
   * argument rejects. If the returned promise resolves, it is resolved with an array 
   * of the values from the resolved promises in the  * * iterable. If the returned 
   * promise rejects, it is rejected with the reason from the promise in the iterable 
   * that rejected. This method can be useful for aggregating results of multiple 
   * promises together.
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
   * @param {Thenable<T>[]} an array of promises.
   * @returns {Thenable<T[]>}
   */
  public static all <T> (thenables: Thenable <T> []): Thenable <T[]> {
    return new Promise <T[]> ((resolve, reject) => {
      if (thenables.length === 0) {
        resolve([])
      } else {
        var results   = new Array(thenables.length)
        var completed = 0;
        thenables.forEach((thenable, index) => 
          thenable.then(value => {
              results[index] = value
              completed     += 1
              if (completed === thenables.length) 
              resolve(results)
            }).catch(reject))
      }
    })
  }

  /**
   * Returns a promise that resolves or rejects as soon as one of the promises in the iterable 
   * resolves or rejects, with the value or reason from that promise.
   * https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Promise
   * @param {Thenable<T>[]} an array of promises.
   * @returns {Thenable<T[]>}
   */
  public static race <T> (thenables: Thenable <T>[]): Thenable <T> {
    return new Promise <T> ((resolve, reject) => {
      thenables.forEach((promise, index) => {
        promise.then(resolve).catch(reject)
      })
    })
  }

  /**
   * Returns a Promise object that is resolved with the given value. If the value is 
   * a thenable (i.e. has a then method), the returned promise will "follow" that
   * thenable, adopting its eventual state; otherwise the returned promise will be 
   * fulfilled with the value. Generally, if you want to know * if a value is a 
   * promise or not - Promise.resolve(value) it instead and work with the return 
   * value as a promise.
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/resolve
   * @param {T} the value to resolve.
   * @returns{Thenable<T>}
   */
  public static resolve <T> (value: T | Thenable<T>): Thenable <T> {
    return new Promise <T> ((resolve, reject) => {
      if(value instanceof Promise)
      value.then(resolve).catch(reject)
      else resolve(<T>value)
    })
  }
  
  /**
   * Returns a Promise object that is rejected with the given reason.
   * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/reject
   * @param {string | Error} Reason why this Promise rejected.
   * @returns{Thenable<T>}
   */
  public static reject <T> (reason: string | Error): Thenable <T> {
    return new Promise <T> ((_, reject) => reject(reason))
  }

  /**
   * internal: marks this promise as resolved.
   * @param {T} the value to resolve with.
   * @returns {void}
   */
  private _resolve(value: T) : void {
    if(this.state === "pending") {
      this.state           = "fulfilled"
      this.value           = value
      this.error_callbacks = []
      while(this.value_callbacks.length > 0) 
      this.value_callbacks.shift()(this.value)
    }
  }

  /**
   * internal: marks this promise as rejected.
   * @param {Error} the error to reject with.
   * @returns {void}
   */
  private _reject(reason: string | Error) : void {
    if(this.state === "pending") {
      this.state           = "rejected"
      this.error           = reason
      this.value_callbacks = []
      while(this.error_callbacks.length > 0) 
      this.error_callbacks.shift()(this.error)
    }
  }
}