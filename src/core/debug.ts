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

/**
 * simple fixed length padding.
 * @param {string} data the data to pad.
 * @param {number} pad the maximum size of this pad.
 * @returns {string}
 */
function pad(data:string, pad: number): string {
  let buffer = []
  for(let i = 0; i < pad; i++) {
    if(i < data.length) {
       buffer.push(data.charAt(i))
    } else {
      buffer.push(' ')
    }
  }
  return buffer.join('')
}

/**
 * a task debugging function that can be passed into a tasks run function.
 * @param {string} data the scoped data.
 * @returns {string}
 */
export function debug (data:string) : void {
  let tree = 
    data.split(':::')
    .map(part => part)
    .map((part, index, array) => {
      if(index < (array.length - 2)) {
        if(index === (array.length - 3)) {
          return "├─"
        }
        return  "| "
      } return part.trim()
    })
    let message = tree.pop()
    console.log(
      '\x1b[32m', 
      pad(tree.join(''), 24),
      '\x1b[0m', "|", 
      message)
}