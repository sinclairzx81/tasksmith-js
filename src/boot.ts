/*--------------------------------------------------------------------------

amd-boot-loader - makes bundled typescript AMD modules work in node.

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

declare var require: Function

//--------------------------------------------------
//
// TypeScript bundled AMD loader for Node.
//
// This script is intended to wrap a amd bundle
// produced by the typescript compiler. This would
// include script generated with the following 
// compiler options.
//
// tsc mymodule.ts --module amd --outFile mymodule.js
//
//---------------------------------------------------

/**
 * definition for modules located within this bundle,
 * as well as a container for modules loaded via
 * commonjs.
 */
interface Definition {
    id           : string
    dependencies : string[],
    factory      : (...args: any[]) => any
}

/**
 * definition accumulator.
 */
let definitions:Definition[] = []

/**
 * resolves a module by its id. recursively loads its dependencies also.
 * @param {string} the name of the module.
 * @param {cache} a cache to accumulator module exports.
 * @returns {any}
 */
const resolve = (id: string, cache: {}) : any => {

    /**
     * special case:
     * 
     * The typescript compiler writes its
     * exports on the exports dependency.
     * In these scenarios, we return to the 
     * dependant a empty object for it to
     * write to. we collect it later.
     */
    if(id === "exports") return  {}

    /**
     * cache:
     * 
     * Some modules may be included more than 
     * once in the bundle, this would result
     * in the potential for cyclic referencing
     * as well as initializing the same thing
     * over and over. Check the cache and return
     * if found.
     */
    if (cache[id] !== undefined)  return cache[id];

    /**
     * locate definition:
     * 
     * Here, we try and locate a definition within
     * the bundle or, attempt to pull it back from
     * nodes require(). In the node case, we wrap
     * require in a definition for consistency.
     */
    let definition :Definition = (definitions.some(definition => definition.id === id)) 
                               ? definitions.filter(definition => definition.id === id)[0] 
                               : ({ id: id,  dependencies: [], factory: () => require(id) })         
    /**
     * dependencies:
     * 
     * before injecting the definition factory,
     * we need to resolve its dependencies. This
     * recursively calls back on itself to load
     * the dependencies exports.
     */
    let dependencies = definition.dependencies.map(dependency => resolve(dependency, cache))

    /**
     * invoke:
     * 
     * invoke this definitions factory by passing its
     * dependencies, store the result.
     */
    let exports = definition.factory.apply({}, dependencies)

    /**
     * typescript exports:
     * 
     * because typescript exports on its exports
     * dependency, we need to extract the output
     * from there instead.
     */
    if(definition.dependencies.some(dependency => dependency === "exports")) 
        exports = dependencies[definition.dependencies.indexOf("exports")]

    /** 
     * cache this module, and return exports.
     */
    return cache[id] = exports
}

/**
 * the collect function resolves definitions
 * in the space and gives its exports. Note
 * that we borrow on the typescript conventions
 * of resolving from the last module in the bundle.
 * @returns {any} the modules exports.
 */
const collect = () => resolve(definitions[definitions.length - 1].id, { 
   	    "require": (arg, callback) => callback( require (arg) ) 
    })

/**
 * The amd define function, called by each module in this bundle.
 * @param {string} the id of the definition.
 * @param {string[]} the dependencies for this definition.
 * @param {Function} the definition factory.
 * @returns {void}
 */
const define = (id: string, dependencies: string[], factory: (...args: any[]) => any) => 
    definitions.push({ id: id, dependencies: dependencies, factory: factory })


//---------------------------------------------
//
// BUNDLED TYPESCRIPT AMD MODULE HERE.
//
//---------------------------------------------

// module.exports = collect()


