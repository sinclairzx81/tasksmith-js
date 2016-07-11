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

/// <reference path="./node.d.ts" />


import {signature}        from "../common/signature"
import {ITask}            from "../core/task"
import {script}           from "../core/script"

import * as http          from "http"
import * as fs            from "fs"
import * as path          from "path"
import * as url           from "url"

/** 
 * the signals script.
 * 
 * the following script gets injected into
 * html documents running in watch mode. 
 * The script creates a long running chunked
 * http request to the __signals endpoint. 
 * Once connected, the client listens for
 * incoming events from the serve server,
 * and attempts to maintain the connection
 * will retry on disconnect.
 * @returns {string} 
 */
const signals_client_script = () => `
<script type="text/javascript">

window.addEventListener("load", function() {
  //---------------------------------
  // tasksmith: signals
  //---------------------------------
  function connect(handler) {
    var xhr = new XMLHttpRequest();
    var idx = 0;
    xhr.addEventListener("readystatechange", function(event) {
      switch(xhr.readyState) {
        case 4: handler("disconnect"); break;
        case 3:
          var signal = xhr.response.substr(idx);
          idx += signal.length;
          handler(signal);
          break;
      }
    });
    xhr.open("GET", "/__signals", true); 
    xhr.send();
  }
  function handler(signal) {
    switch(signal) {
      case "established": console.log("signals: established");  break;
      case "reload"     : window.location.reload(); break;
      case "ping"       : break;    
      case "disconnect":
        console.log("signals: disconnected");
        setTimeout(function() {
          console.log("signals: reconnecting...");
          connect(handler)
        }, 1000) 
        break;
    }
  }
  connect(handler)
})
</script>
`

/**
 * injects the signals client script into a 
 * html document. the script in injected at
 * the end of the document.
 * @param {string} the content being injected
 * @returns {string} the injected content.
 */
const inject_signals_script = (content: string) => {
  let inject_index  = content.length;
  let watch_prefix  = content.slice(0, inject_index)
  let watch_content = signals_client_script()
  let watch_postfix = content.slice(inject_index)
  content = [
    watch_prefix, 
    watch_content, 
    watch_postfix
  ].join("")
  return content;
}

/**
 * creates a infinite task that serves a directory over http.
 * @param {string} the directory to serve.
 * @param {number} the port to serve this application on.
 * @param {boolean} should the task watch for content changes and live reload. (default false)
 * @param {number} suspends the reload signal for the given number of milliseconds. (default 0)
 * @returns {ITask}
 */
export function serve(directory: string, port: number, watch: boolean, delay: number) : ITask

/**
 * creates a infinite task that serves a directory over http.
 * @param {string} the directory to serve.
 * @param {number} the port to serve this application on.
 * @param {boolean} should the task watch for content changes and live reload. (default false)
 * @returns {ITask}
 */
export function serve(directory: string, port: number, watch: boolean) : ITask

/**
 * creates a infinite task that serves a directory over http.
 * @param {string} the directory to serve.
 * @param {number} the port to serve this application on.
 * @returns {ITask}
 */
export function serve(directory: string, port: number) : ITask

/**
 * creates a infinite task that serves a directory over http.
 * @param {any[]} arguments
 * @returns {ITask}
 */
export function serve(...args: any[]) : ITask {
  let param = signature<{
    directory : string,
    port      : number,
    watch     : boolean,
    delay     : number,
  }>(args, [
      { pattern: ["string", "number",  "boolean", "number"],            map : (args) => ({ directory: args[0], port: args[1], watch: args[2] , delay: args[3] })  },
      { pattern: ["string", "number",  "boolean"],                      map : (args) => ({ directory: args[0], port: args[1], watch: args[2] , delay: 0       })  },
      { pattern: ["string", "number"],                                  map : (args) => ({ directory: args[0], port: args[1], watch: false   , delay: 0       })  }
  ])
  return script("node/serve", context => {
    let clients   : Function[]    = []    // signal clients.
    let listening : boolean       = false // http listening state
    let cancelled : boolean       = false // task cancelation state
    let waiting   : boolean       = true  // fs signal wait state
    let server    : http.Server   = null  // http server
    let watcher   : fs.FSWatcher  = null  // directory watcher

    /**
     * ========================================================
     * watcher:
     * if in watch mode, we setup a recursive
     * watch on the given directory. When
     * we get a signal from the file system,
     * enumerate the clients array and dispatch
     * a reload signal to each.
     * ========================================================
     */
    if(param.watch === true) {
      watcher = fs.watch(param.directory, {recursive: true}, (event, filename) => {
        if(cancelled === true) return
        if(waiting === true) {
          waiting = false
          setTimeout(() => {
            clients.forEach(client => client("reload"))
            setTimeout(() =>  waiting = true, 100)
          }, param.delay)
        }
      })
    }

    /** 
     * http server:
     * sets up the static file server.
     */
     server = <http.Server>http.createServer((request, response) => {
      
      switch(request.url) {
        /**
         * ========================================================
         * signals endpoint:
         * if a request comes in for the __signals
         * endpoint, initialize a long running
         * comet request. clients hold onto this
         * request waiting for reload signals.
         * ========================================================
         */
        case "/__signals": {

          /**
           * format headers:
           * note: browsers may choose to buffer data
           * prior to emitting to the client. As a work
           * around, the following sets the content-type
           * as text/html (not text/plain) which forces
           * the browser to emit data immediately.
           * 
           * Everything else is standard in this setup,
           * but we do emit a established signal to the 
           * client to say hi.
           */
          context.log("SIG: client connected.")
          response.setHeader('Connection', 'Transfer-Encoding');
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.setHeader('Transfer-Encoding', 'chunked');
          response.write    ("established")

          /** 
           * client:
           * Each client contains consists of a single
           * function which is used to emit a signal
           * on its respective http response. we push
           * this function into the clients array.
           */
          let client = (signal) => {
            context.log("SIG: " + signal)
            response.write(signal) 
          }; clients.push(client)
          
          /** 
           * keep-alive:
           * setup a simple keep alive. Most clients
           * will timeout the TCP request if no data
           * is received over the transport. 
           */
          let keep_alive = setInterval(() => {
            response.write("ping") 
          }, 15000);

          /**
           * client drop:
           * we listen out on the raw tcp connection
           * for the "end" event. This is a reliable
           * indication that the client has indeed
           * dropped (except in IE). Remove client 
           * from clients array.
           */
          let request_: any = request
          request_.connection.on("end", () => {
            clearInterval(keep_alive)
            clients = clients.splice(clients.indexOf(client), 1)
            context.log("SIG: client disconnected")
          })
        } break;

        /**
         * ========================================================
         * static handler:
         * A standard http static files handler, with the 
         * exception that in on watch mode, we inject html
         * documents with the watch injection script.
         * ========================================================
         */
        default: {
          /**
           * format resource path:
           * business as usual, here we make best attempts
           * to sanitize the incoming url, with particular
           * focus given to preventing the caller from escaping
           * out of the served directory.
           */
          let resolved = path.resolve("./", param.directory) + "\\"
          let safeurl  = request.url.replace(new RegExp("\\.\\.", 'g'), "");
          let uri      = url.parse(safeurl)
          let resource = path.join(resolved, uri.pathname)
          resource     = resource.replace(new RegExp("\\\\", 'g'), "/");
          if(resource.lastIndexOf("/") === (resource.length - 1))
            resource = resource + "index.html"
          resource = path.normalize(resource)

          /**
           * mine types:
           * We don't support all types of mime, but we do 
           * the most common. The reason for this was to keep
           * this script light. callers can add in additional
           * mimes not listed here as they see fit.
           */
          var content_type = "application/octet-stream";
          switch (path.extname(resource)) {
              case ".js"   : content_type = "text/javascript";  break;
              case ".css"  : content_type = "text/css";         break;
              case ".json" : content_type = "application/json"; break;
              case ".png"  : content_type = "image/png";        break;  
              case ".jpeg" :    
              case ".jpg"  : content_type = "image/jpg";        break;
              case ".wav"  : content_type = "audio/wav";        break;
              case ".mp4"  : content_type = "video/mp4";        break;
              case ".mp3"  : content_type = "audio/mpeg";       break;
              case ".htm":
              case ".html": content_type  = "text/html";        break;
          }

          fs.stat(resource, (err, stat) => {

            /**
             * stat errors.
             * probably a 404, return one for now.
             */
            if(err) {
              response.writeHead(404, { "Content-Type": "text/plain" })
              response.end("404 - not found", "utf-8") 
              return
            }

            /**
             * directory serving:
             * currently not supported.
             */
            if(stat.isDirectory()) {
              response.writeHead(404, { "Content-Type": "text/plain" })
              response.end("403 - forbidden", "utf-8") 
              return
            }


            /**
             * content type handling.
             */
            switch(content_type) {

              /**
               * html script injection:
               * if in watch mode, we need to inject
               * the signals client script, the code
               * below checks if we are in watch mode,
               * and if so, injects the signals script.
               */
              case "text/html":
                context.log(request.method + ": " + request.url)
                fs.readFile(resource, "utf8", (error, content) => {
                    content = (param.watch === true) ? inject_signals_script(content) : content
                    response.writeHead(200, { "Content-Type": content_type });
                    response.end(content, "utf-8");
                });
                break;
              /**
               * stream everything else.
               * everything else is streamed, this 
               * should account for video, audio and
               * other types of media.
               */
              default:
                context.log(request.method + ": " + request.url)
                let readstream = fs.createReadStream(resource)
                readstream.pipe(response)
                break;
            }
          })
        }         
      }
    }).listen(param.port, error => {
      if(error) { context.fail(error.message); return; }
      listening = true
    })

    /**
     * cancel:
     * close watcher and server if applicable.
     */
    context.oncancel(reason => {
      cancelled = true
      if(server  !== null && listening   === true) server.close()
      if(watcher !== null && param.watch === true) watcher.close()
      context.fail(reason)
    })
  })
}