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

import * as http from "http"
import * as fs   from "fs"
import * as path from "path"

/** 
 * the signals script.
 * 
 * the follow script is injected into a page
 * when running in watch mode. The script
 * creates a comet connection to the 
 * signals server /__signals endpoint. 
 * Its purpose is to listen for "reload"
 * signals from the endpoint, these are
 * triggered by watch signals.
 * @returns {string} 
 */
const signals_script = () => `    
<script type="text/javascript">
window.addEventListener("load", function() {
  var signals = function(callback) {
  var xhr     = new XMLHttpRequest();
  var idx     = 0;
  xhr.addEventListener("readystatechange", function(event) {
    switch(xhr.readyState) {
      case 4: callback("signals disconnected."); break;
      case 3:
        var signal = xhr.response.substr(idx);
        idx += signal.length;
        callback(signal);
        break;
    }
  });
  xhr.open("GET", "/__signals", true); 
  xhr.send();
  }
  signals(function(signal) {
    switch(signal) {
      case "reload": window.location.reload(); break;
      case "done": console.log("disconnected"); break;
    }
  });
});</script>`.replace("\n", "")
             .replace("\t", "")

/**
 * injects the signals library into content. 
 * The content is expected to be html content,
 * and will automatically add html / head 
 * elements if not found.
 * @param {string} the content being injected
 * @returns {string} the injected content.
 */
const inject_signals_script = (content: string) => {
  let html_idx = content.indexOf("<html>")
  if(html_idx === -1) {
    content = [
      "<html>", 
      content, 
      "</html>"
    ].join("")
    html_idx = 6
  } else html_idx += 6
  let head_idx = content.indexOf("<head>")
  if(head_idx === -1) {
    let head_prefix  = content.slice(0, html_idx)
    let head_content = "<head></head>"
    let head_postfix = content.slice(html_idx)
    content = [
      head_prefix, 
      head_content, 
      head_postfix
    ].join("")
    head_idx = 12
  } else head_idx += 6
  let signals_prefix  = content.slice(0, head_idx)
  let signals_content = signals_script()
  let signals_postfix = content.slice(head_idx)
  content = [
    signals_prefix, 
    signals_content, 
    signals_postfix
  ].join("")
  return content;
}

/**
 * serves the signals endpoint.
 * @param {string} the directory to serve,
 * @param {IncomingMessage} the http server request
 * @param {ServerResponse} the http server response.
 * @returns {void}
 */
const serve_signals = (directory:string, log: (...args: any[]) => void, request: http.IncomingMessage, response: http.ServerResponse) => {
  response.on("end", () => log("detected client drop."))
  response.writeHead(200, {"Content-Type": "text/plain"})
  let handle   = setTimeout(() => response.write("reload"), 500)
  let temp:any = request
  temp.connection.on("end", () =>  clearInterval(handle))
} 

/**
 * serves this directory as static.
 * @param {string} the directory to serve,
 * @param {IncomingMessage} the http server request
 * @param {ServerResponse} the http server response.
 * @returns {void}
 */
const serve_static = (directory:string, log: (...args: any[]) => void, request: http.IncomingMessage, response: http.ServerResponse) => {
    var filePath = "." + request.url;
    if (filePath == "./") filePath = "./index.html";
    var contentType = "application/octet-stream";
    switch (path.extname(filePath)) {
        case ".js"   : contentType = "text/javascript";  break;
        case ".css"  : contentType = "text/css";         break;
        case ".json" : contentType = "application/json"; break;
        case ".png"  : contentType = "image/png";        break;  
        case ".jpeg" :    
        case ".jpg"  : contentType = "image/jpg";        break;
        case ".wav"  : contentType = "audio/wav";        break;
        case ".mp3"  : contentType = "audio/mpeg";       break;
        case ".htm":
        case ".html": contentType  = "text/html";        break;
    }

    
    fs.readFile(filePath, function(error, content) {
        if (error) {
          switch(error.code) {
            case "ENOENT":
              response.writeHead(404, { "Content-Type": "text/plain" })
              response.end("404 - not found", "utf-8") 
              break;
            default: 
              response.writeHead(500, { "Content-Type": "text/plain" })
              response.end("500 - server error " + error.message, "utf-8") 
              break;
          } return;
        }

        response.writeHead(200, { "Content-Type": contentType });
        response.end(content, "utf-8");
    });
}

/**
 * creates a tasksmith signals server.
 * @param {string} the directory to serve.
 * @param {boolean} a boolean indicating if we are running in signals mode.
 * @returns {Server} a instance of the signals server. 
 */
export const createServer = (directory: string, watch: boolean, log: (...args: any[]) => void) => http.createServer((request, response) => {
  switch(request.url) {
    case "__signals": serve_signals(directory, log, request, response); break;
    default:          serve_static (directory, log, request, response); break;
  }
})
