/*--------------------------------------------------------------------------

tabulate-js - maps javascript objects to tabular strings

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

/**
 * interface for cell mappings.
 */
export interface TabulateMapping {
  /** the javascript property to map */
  key    : string
  /** the width of the cell (defaults to 8) */
  width? : number
  /** the right side padding of the cell (defaults to 0) */
  pad?   : number
  /** the option to wrap long text in the cell (defaults to false) */
  wrap?  : boolean
 /** a mapping function to convert the property into a string. */
  map? : (obj:any) => string
}

/**
 * [internal] interface for cells.
 */
interface TabulateCell {
  lines : string[]
  width : number,
  pad   : number,  
  wrap  : boolean
}

/**
 * interface for input objects being tabulated.
 */
export interface TabulateObject {
  [key: string]: string
}

/**
 * interface for tabulate render signature.
 */
export interface TabulateFunction {
  (obj: TabulateObject): string
}

/**
 * creates a empty string of the given length.
 * @param   {number} the size of the pad.
 * @returns {string}
 */
const pad = (length: number): string => {
  let buf = ""
  for(let i = 0; i < length; i++) 
    buf = buf.concat(" ")
  return buf
}

/**
 * initializes default mapping properties
 * @param {TabulateMapping} the mapping to intiailize.
 * @returns {TabulateMapping}
 */
const defaults = (mapping: TabulateMapping) : TabulateMapping => ({
  key   : (mapping.key   !== undefined) ? mapping.key    : "",
  width : (mapping.width !== undefined) ? mapping.width  : 8,
  pad   : (mapping.pad   !== undefined) ? mapping.pad    : 0,
  wrap  : (mapping.wrap  !== undefined) ? mapping.wrap   : false,
  map   : (mapping.map   !== undefined) ? mapping.map    : value => {
    if(value === undefined) return "undefined"
    if(value === null)      return "null"
    return value.toString()
  }
})

/**
 * maps the tabulate input parameter to a cell.
 * @param   {TabulateObject} the object to map.
 * @param   {TabulateMapping} the mapping object.
 * @returns {TabulateCell}
 */
const map = (obj: TabulateObject, mapping: TabulateMapping) : TabulateCell => ({
  width : mapping.width,
  pad   : mapping.pad,
  wrap  : mapping.wrap,
  lines : (obj[mapping.key] === undefined && obj[mapping.key] === null) 
      ? [""] 
      : mapping.map(obj[mapping.key])
               .replace("\r", "")
               .replace("\t", "  ")
               .split("\n")
})

/**
 * truncates the contents of this cell to fit within the cell width.
 * @param {TabulateCell} the cell to truncate.
 * @returns {TabulateCell} the truncated cell
 */
const truncate = (cell: TabulateCell) : TabulateCell => ({
  wrap  : cell.wrap,
  width : cell.width,
  pad   : cell.pad,
  lines : cell.lines.reduce((buf, line, index) => {
    let copy  = line.slice(0)
    let width = cell.width - cell.pad
    copy = (copy.length >= width)
      ? copy.substring(0, width) 
      : copy
    let feed = "".concat(copy, pad(cell.width - copy.length) )
    buf.push( feed )
    return buf
  }, [])
})

/**
 * wraps the lines within a cell.
 * @param {TabulateCell} the cell to wrap.
 * @returns {TabulateCell} the wrapped lines.
 */
const wrap = (cell: TabulateCell) : TabulateCell => ({
  wrap  : cell.wrap,
  width : cell.width,
  pad   : cell.pad,
  lines : cell.lines.reduce((buf, line) => {
    let copy    = line.slice(0)
    let padding = pad(cell.pad)
    let inner   = cell.width - cell.pad
    while(copy.length > inner) { 
      let feed = "".concat(copy.substring(0, inner), padding)
      copy = copy.substring(inner)
      buf.push(feed)
    }
    let feed = "".concat(copy, pad(cell.width - copy.length) )
    buf.push( feed )
    return buf
  }, [])
})

/**
 * projects the cells into a string.
 * @param {TabulateCell} the cells to project
 * @returns {string}
 */
const project = (cells: TabulateCell[]) : string => {
  let result    = []
  let empty     = cells.map   (cell => pad(cell.width))
  let linecount = cells.reduce((acc, cell) => (cell.lines.length > acc) 
                ? cell.lines.length
                : acc, 0)
  for(let li = 0; li < linecount; li++) {
    for(let ci = 0; ci < cells.length; ci++) {
      (li < cells[ci].lines.length)  
          ? result.push(cells[ci].lines[li])
          : result.push(empty[ci])
    }
    if(li < linecount - 1) result.push("\n")
  }
  return result.join("")
}

/**
 * creates a tabulate render function.
 * @param   {TabulateMapping} how this function should map the output.
 * @returns {TabulateFunction}
 * @example
 * 
 * let func = tabulate([
 *  { key: "firstname"   , width: 8 },
 *  { key: "lastname"    , width: 8 },
 *  { key: "email"       , width: 16},
 *  { key: "description" , width: 20, wrap: true }
 * ])
 *
 * let output = func({
 *  firstname:   "dave",
 *  lastname:    "smith",
 *  email:       "dave.smith@domain.com",
 *  description: "Ut nam decore blandit, eu magna utroque repudiare is quaeque epicurei id est."
 * })
 */
export const tabulate = (mappings: TabulateMapping[]) : TabulateFunction => 
  (obj: TabulateObject): string => 
    project ( mappings.map(mapping => defaults(mapping))
                      .map(mapping => map (obj, mapping))
                      .map(cell => cell.wrap ? wrap(cell) 
                                             : truncate(cell)) )