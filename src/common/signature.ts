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

export type TypeName = "undefined" | "null" | "function" | "string" | "number" | "boolean" | "date" | "array" | "object" | "regex"

/**
 * reflects the given type, returning its typename.
 * @param {any} the object / value to reflect.
 * @returns {TypeName}
 */
export const reflect = (obj: any): TypeName => {
  if (obj === undefined)         return "undefined"
  if (obj === null)              return "null"
  if (typeof obj === "function") return "function"
  if (typeof obj === "string")   return "string"
  if (typeof obj === "number")   return "number"
  if (typeof obj === "boolean")  return "boolean"
  if (typeof obj === "object") {
    if (obj instanceof Array)  return "array"
    if (obj instanceof Date)   return "date"
    if (obj instanceof RegExp) return "regex"
  } return "object"
}

/**
 * compares the left and right typenames using a union intersect.
 * @param {string} the union type a.
 * @param {string} the union type b.
 * @returns {boolean} true if they match.
 */
export const compare_type = (left: string, right: string): boolean => {
  let a = left.split("|").map(type => type.trim()).filter(type => type.length > 0)
  let b = right.split("|").map(type => type.trim()).filter(type => type.length > 0)
  if (a.indexOf("any") !== -1) return true
  if (b.indexOf("any") !== -1) return true
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      if (a[i] === b[j]) return true
    }
  } return false
}

/**
 * compares the given type arrays for equality.
 * @param {Array<string>} the left type array.
 * @param {Array<string>} the right type array.
 * @returns {boolean}
 */
export const compare_type_array = (left: Array<string>, right: Array<string>): boolean => {
  if (left.length !== right.length) return false
  for (let i = 0; i < left.length; i += 1) {
    if (compare_type(left[i], right[i]) === false)
      return false
  } return true
}

export interface Mapping {
  typenames: Array<string>
  func: (...args: any[]) => Array<any>
}

export interface ErrorFunc {
  (error: any): void
}

/**
 * Signature: acts as a arguments array runtime type validator.
 */
export class Signature {
  private mappings  : Array<Mapping>
  private errorfuncs: Array<ErrorFunc>

  /**
   * creates a new signature.
   * @param {Array<any>} the function arguments array.
   * @returns {Signature}
   */
  constructor(private args: Array<any>) {
    this.mappings = new Array<Mapping>()
    this.errorfuncs = new Array<ErrorFunc>()
  }

  /**
   * creates a signature type mapping.
   * @param {Array<string>} typenames the typename pattern for this signature.
   * @param {Function} the mapping function for this signature.
   * @returns {Signature} 
   */
  public map(typenames: Array<string>, func: (...args: Array<any>) => Array<any> = (...args) => args): Signature {
    this.mappings.push({ typenames: typenames, func: func });
    return this
  }

  /**
   * creates a error handler for this signature. 
   * @param {Function} func the error handler function.
   * @returns {Signature}
   */
  public err(func: (error: any) => void): Signature {
    this.errorfuncs.push(func)
    return this
  }

  /**
   * processes this signature. 
   * @param {Function} func the function to receive signature arguments.
   * @returns {void}
   */
  public run(func: (...args: Array<any>) => any): any {
    let typenames = this.args.map(arg => reflect(arg))
    let mapping   = this.mappings.find(mapping => compare_type_array(mapping.typenames, typenames))
    if(mapping === undefined) {
      this.raiseError()
    } else {
      return func.apply({}, 
        mapping.func.apply({}, 
          this.args))
    }
  }

  /**
   * raises errors for this signature.
   * @returns {void}
   */
  private raiseError(): void {
    let buffer = []
    buffer.push("signature error:")
    buffer.push("params:")
    buffer.push(`  (${this.args.map(arg => reflect(arg)).join(", ")})`)
    buffer.push("expect:")
    this.mappings.forEach(mapping => buffer.push(`  (${mapping.typenames.join(", ")})`))
    let error = buffer.join("\n")
    if (this.errorfuncs.length > 0) 
        this.errorfuncs.forEach(func => func(error))
    else throw Error(error)
  }
}

/**
 * creates a new signature. 
 * @param {Array<any>}
 */
export function signature(args: Array<any>): Signature {
  return new Signature(args)
}