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

import * as http          from "http"
import * as fs            from "fs"
import * as path          from "path"
import {signature}        from "../common/signature"
import {ITask}            from "../core/task"
import {script}           from "../core/script"

/** 
 * the watch script.
 * 
 * the follow script is injected into a page
 * when running in watch mode. The script
 * creates a comet connection to the 
 * watch server /__watch endpoint. 
 * Its purpose is to listen for "reload"
 * watch from the endpoint, these are
 * triggered by watch watch.
 * @returns {string} 
 */
const watch_client_script = () => `
<!-- BEGIN: WATCH SCRIPT -->
<script type="text/javascript">
  window.addEventListener("load", function() {
    var watch = function(callback) {
    var xhr     = new XMLHttpRequest();
    var idx     = 0;
    xhr.addEventListener("readystatechange", function(event) {
      switch(xhr.readyState) {
        case 4: callback("watch disconnected."); break;
        case 3:
          var watch = xhr.response.substr(idx);
          idx += watch.length;
          callback(watch);
          break;
      }
    });
    xhr.open("GET", "/__watch", true); 
    xhr.send();
  }
  watch(function(signal) {
    switch(signal) {
      case "connect": console.log("watch: connected");  break;
      case "reload":  window.location.reload();  break;
      case "done":    console.log("watch: disconnected"); break;
    }
  });
});</script>
<!-- END: WATCH SCRIPT -->
`.replace("\n", "")
 .replace("\t", "")

/**
 * injects the watch client script into the 
 * html document, the script is injected at
 * the location of the closing html tag, if
 * not found, nothing is injected and the 
 * content is returned as is.
 * @param {string} the content being injected
 * @returns {string} the injected content.
 */
const inject_watch_script = (content: string) => {
  let inject_index = content.indexOf("</html>")
  if(inject_index === -1) return content
  let watch_prefix  = content.slice(0, inject_index)
  let watch_content = watch_client_script()
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
 * @param {string} a message to log.
 * @param {string} the directory to serve.
 * @param {number} the port to serve this application on.
 * @param {boolean} should the task watch for content changes and live reload. default is false.
 * @returns {ITask}
 */
export function serve(message: string, directory: string, port: number, watch: boolean) : ITask

/**
 * creates a infinite task that serves a directory over http.
 * @param {string} the directory to serve.
 * @param {number} the port to serve this application on.
 * @param {boolean} should the task watch for content changes and live reload. default is false.
 * @returns {ITask}
 */
export function serve(directory: string, port: number, watch: boolean) : ITask

/**
 * creates a infinite task that serves a directory over http.
 * @param {string} a message to log.
 * @param {string} the directory to serve.
 * @param {number} the port to serve this application on.
 * @returns {ITask}
 */
export function serve(message: string, directory: string, port: number) : ITask

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
    message   : string,
    directory : string,
    port      : number,
    watch     : boolean
  }>(args, [
      { pattern: ["string", "string",  "number", "boolean"], map : (args) => ({ message: args[0], directory: args[1], port: args[2], watch: args[3]  })  },
      { pattern: ["string", "number",  "boolean"],           map : (args) => ({ message: null,    directory: args[0], port: args[1], watch: args[2]  })  },
      { pattern: ["string", "string",  "number"],            map : (args) => ({ message: args[0], directory: args[1], port: args[2], watch: false    })  },
      { pattern: ["string", "number"],                       map : (args) => ({ message: null,    directory: args[0], port: args[1], watch: false    })  }
  ])
  return script("node/serve", context => {
    if(param.message !== null) context.log(param.message)

    /**
     * clients:
     * 
     * A collection of clients. This collection
     * is appended when a user-agent visits the
     * /__watch endpoint.
     */
    let clients = []

    /**
     * ========================================================
     * directory watcher:
     * 
     * if in watch mode, setup a recursive
     * watch on the given directory. When
     * we get a signal from the file system,
     * enumerate the clients array and dispatch
     * a reload signal to each.
     * ========================================================
     */
    
    if(param.watch === true) {
      let waiting_on_fs_watch = true
      fs.watch(param.directory, {recursive: true}, (event, filename) => {
        if(waiting_on_fs_watch === true) {
          waiting_on_fs_watch = false
          clients.forEach(client => client("reload"))
          setTimeout(() => {  waiting_on_fs_watch = true }, 100)
        }
      })
    }

    /** 
     * http server:
     * 
     * sets up the static file server.
     */
    http.createServer((request, response) => {

      switch(request.url) {
        /**
         * ========================================================
         * watch endpoint:
         * 
         * if a request comes in for the __watch
         * endpoint, initialize a long running
         * comet request. clients hold onto this
         * request waiting for reload signals.
         * ========================================================
         */
        case "/__watch": {

          /**
           * format headers:
           * 
           * note: browsers may choose to buffer data
           * prior to emitting to the client. As a work
           * around, the following sets the content-type
           * as text/html (not text/plain) which forces
           * the browser to emit data immediately.
           * 
           * Everything else is standard in this setup,
           * but we do emit a connect signal to the client
           * to say hi.
           */
          context.log("client connected.")
          response.setHeader('Connection', 'Transfer-Encoding');
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.setHeader('Transfer-Encoding', 'chunked');
          response.write    ("connect")

          /** 
           * client:
           * 
           * A client in this servers instance is nothing
           * more than a function which emits data to 
           * the response. Once created, push it to the
           * clients array.
           */
          let client = (signal) => {
            context.log(signal)
            response.write(signal) 
          }; clients.push(client)
          
          /**
           * client drop:
           * 
           * we listen out on the raw tcp connection
           * for the "end" event. This is a reliable
           * indication that the client has indeed
           * dropped. Remove client from client array
           * on these events.
           */
          let request_: any = request
          request_.connection.on("end", () => {
            context.log("client dropped")
            let index = clients.indexOf(client)
            clients = clients.splice(index, 1)
          })
        } break;

        /**
         * ========================================================
         * static handler:
         * 
         * A standard http static files handler, with the 
         * exception that in on watch mode, we inject html
         * documents with the watch injection script.
         * ========================================================
         */
        default: {

          /**
           * format resource path:
           * 
           * business as usual, here we make best attempts
           * to sanitize the incoming url, with particular
           * focus given to preventing the caller from escaping
           * out of the served directory.
           */
          let resolved = path.resolve("./", param.directory) + "\\"
          let safeurl  = request.url.replace(new RegExp("\\.\\.", 'g'), "");
          let resource = path.join(resolved, safeurl)
          resource     = resource.replace(new RegExp("\\\\", 'g'), "/");
          if(resource.lastIndexOf("/") === (resource.length - 1))
            resource = resource + "index.html"
          resource = path.normalize(resource)

          /**
           * mine types:
           * 
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
             * 
             * probably a 404, return one just in 
             * case, be more specific in future.
             */
            if(err) {
              response.writeHead(404, { "Content-Type": "text/plain" })
              response.end("404 - not found", "utf-8") 
              return
            }

            /**
             * directory serving:
             * 
             * currently not supported...might
             * look at this in future.
             */
            if(stat.isDirectory()) {
              response.writeHead(404, { "Content-Type": "text/plain" })
              response.end("404 - not found", "utf-8") 
              return
            }


            /**
             * content type handling.
             * 
             * given the need to inject the watch content
             * into html in watch mode, we load the full
             * content of html documents for parsing 
             * reasons, everything is streamed.
             */
            switch(content_type) {

              /**
               * html script injection:
               * 
               * if in watch mode, we need to inject
               * the watch client script, the code
               * below checks the watch and if so
               * injects.
               */
              case "text/html":
                context.log(request.method + " - " + request.url)
                fs.readFile(resource, "utf8", (error, content) => {
                    content = (param.watch === true) ? inject_watch_script(content) : content
                    response.writeHead(200, { "Content-Type": content_type });
                    response.end(content, "utf-8");
                });
                break;
              /**
               * stream everything else.
               * 
               * everything else is streamed, this 
               * should account for video, audio and
               * other types of media.
               */
              default:
                context.log(request.method + " - " + request.url)
                let readstream = fs.createReadStream(resource)
                readstream.pipe(response)
                break;
            }
          })
        }         
      }
    }).listen(param.port, error => {
      if(error) context.fail(error.message)
    })
  })
}