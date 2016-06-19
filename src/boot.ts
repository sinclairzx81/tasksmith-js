/*--------------------------------------------------------------------------

amd-boot-loader - makes bundled AMD modules work in node.

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

//---------------------------------------------
// AMD boot loader.
//---------------------------------------------
//
// Sometimes, it's convenient to be able to 
// bundle a bunch of commonjs modules into a
// single output, however, the tsc compiler 
// provides no options for bundling cjs in 
// this way, but it does support AMD 
// bundling....
//
// "compilerOptions": {
//     "module"  : "amd",
//     "outFile" : "bundled.js"
//  }
//
// If compiling with these options, the 
// following script can be merged at the 
// beginning of the bundled file to allow
// it to be converted into a commonjs
// module, for example...
//
// bundled.js
//
// [the boot loader]
//
// [the bundled AMD module]
// 
// module.exports = __collect()
//
//---------------------------------------------

declare var require: Function

let definitions = {}
let cached      = {
    "require": (arg, callback) => callback( require (arg) ),
    "exports": {}
}

/**
 * The AMD define function.
 * @param {string} the name of the module.
 * @param {string[]} the names of dependencies.
 * @param {Function} the resolver function.
 * @returns {void}
 */
const define = (name, deps, fn) : void => {
    definitions[name] = { deps: deps, fn: fn }
}

/**
 * Resolves an AMD module.
 * @param {string} the name of the module.
 * @returns {any} the modules exports.
 */
const __resolve = (name) : any => {

    // if resolving exports, return empty object
    // for caller to populate.
    if(name === "exports") return  {}
    
    // if module is cached, return it.
    if (cached[name] !== undefined) {
        return cached[name];
    }

    // if module amd definition exists, resolve it.
    else if(definitions[name] !== undefined) {
        var args = definitions[name].deps.map(name => __resolve(name));
        definitions[name].fn.apply({}, args);
        return cached[name] = args[definitions[name].deps.indexOf("exports")];
    }
    // still not found, require it.
    else {
        return require(name)
    }
}

/**
 * Collects the AMD modules exports.
 * @param {string} the name of the module.
 * @returns {any} the modules exports.
 */
const __collect = () : any => {
    let ids = Object.keys(definitions)
    return __resolve(ids[ids.length - 1])
}

//---------------------------------------------
// bundled AMD module goes here....
//---------------------------------------------

// module.exports = __collect()


