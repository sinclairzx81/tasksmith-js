/*--------------------------------------------------------------------------

signature-js - javascript library for working with overloaded method signatures.

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

/** type names. */
export type SignatureTypeName = "function" 
                              | "string" 
                              | "number" 
                              | "array" 
                              | "object" 
                              | "date" 
                              | "boolean"

/** signature mapping type */
export interface SignatureMapping<T> {
  pattern : SignatureTypeName[],
  map     : (args: any[]) => T
}

/**
 * returns the typename of the given object.
 * @param {any} the object to reflect.
 * @returns {TypeName} the typename of this object
 */
const reflect = (obj: any) : SignatureTypeName => {
    if(typeof obj === "function") return "function"
    if(typeof obj === "string")   return "string"
    if(typeof obj === "number")   return "number"
    if(typeof obj === "boolean")  return "boolean"
    if(typeof obj === "object") {
        if (obj instanceof Array)  return "array"
        if (obj instanceof Date)   return "date"
    } return "object"
}

/**
 * matches the given arguments against this mapping.
 * @param {any[]} the arguments being matched.
 * @param {Mapping<T>} the mapping.
 * @returns {boolean} true if matched.
 */
const match = <T>(args: any[], mapping: SignatureMapping<T>) : boolean => {
  if(args.length !== mapping.pattern.length) return false
  else return mapping.pattern.every((type, index) => 
    reflect(args[index]) === type)
}

/**
 * returns the type T from a varying length argument array.  if no 
 * mapping is found, this function throws a invalid argument error.
 * @param {any[]} the arguments being mapped.
 * @param {Mapping<T>} the mapping.
 * 
 * @example
 * 
 * let param = signature(["string", 123], [
 *   { types: ["string", "number"], map : (args) => ({ name: args[0], value: args[1]  })  },
 *   { types: ["string"],           map : (args) => ({ name: null,    value: args[0]  })  },
 * ])
 */
export const signature = <T>(args: any[], mappings: SignatureMapping<T>[]) => {
  let matches = mappings.filter(mapping => match(args, mapping))
  if      (matches.length === 1) return matches[0].map(args)
  else if (matches.length > 1)   throw Error("signature: ambiguous arguments.")
  else                           throw Error("signature: no overload found for given arguments.")
}