/*--------------------------------------------------------------------------

watch-js - micro static server with optional live reload.

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

import * as http from "http"
import * as fs   from "fs"
import * as path from "path"

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
  watch(function(watch) {
    switch(watch) {
      case "connect": console.log("watch: connected");  break;
      case "reload":  window.location.reload();  break;
      case "done":    console.log("watch: disconnected"); break;
    }
  });
});</script>`.replace("\n", "")
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
 * creates a tasksmith watch server.
 * @param {string} the directory to serve.
 * @param {boolean} a boolean indicating if we are running in watch mode.
 * @returns {Server} a instance of the watch server. 
 */
export const createServer = (directory: string, watch: boolean, log: (...args: any[]) => void) => {
  
  /**
   * listeners:
   * 
   * A collection of watch listeners. When
   * receiving a incoming watch event in 
   * watch mode, it turns to this listeners
   * array to emit watch to clients.
   */
  let listeners = []

  /**
   * directory watcher:
   * 
   * if in watch mode, setup a recursive
   * watch on the given directory. When
   * we get a watch from the file system,
   * enumerate the listeners array and emit
   * a reload watch. This will cause all
   * connected clients to reconnect.
   */
  let waiting_on_fs_watch = true
  if(watch === true) {
    fs.watch(directory, {recursive: true}, (event, filename) => {
      if(waiting_on_fs_watch === true) {
        waiting_on_fs_watch = false
        listeners.forEach(listener => listener("reload"))
        setTimeout(() => {  waiting_on_fs_watch = true }, 100)
      }
    })
  }

  return http.createServer((request, response) => {
    switch(request.url) {
      /**
       * watch comet endpoint:
       * 
       * if accessing this server on this endpoint,
       * its a connection to the watch endpoint.
       * here, we setup a comet endpoint and register
       * a emit function to our listeners array.
       */
      case "/__watch": {

        /**
         * format headers:
         * 
         * note: browsers may choose to buffer data
         * prior to emitting to the client. As a work
         * around, the following sets the content-type
         * as text/html (not text/plain) which seems
         * to have the browser emit the data immedately.
         * note, the transfer-encoding is chunked, standard
         * stuff. we also emit connect to the browser to 
         * say hi.
         */
        log("watch: client connected.")
        response.setHeader('Connection', 'Transfer-Encoding');
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.setHeader('Transfer-Encoding', 'chunked');
        response.write    ("connect")

        /** 
         * listener:
         * 
         * here we create a emitter function. 
         * this function is added to our listeners
         * array.
         */
        let listener = (watch) => {
          log("watch: emit " + watch)
          response.write(watch) 
        }; listeners.push(listener)
        
        /**
         * drops:
         * 
         * we listen out on the raw tcp connection
         * for the "end" event. This is a reliable
         * watch that the client has indeed navigated
         * away. We remove our listener. done.
         */
        let request_: any = request
        request_.connection.on("end", () => {
          log("watch: client dropped")
          let index = listeners.indexOf(listener)
          listeners = listeners.splice(index, 1)
        })   
        break; 
      }

      /**
       * static handler:
       * 
       * A standard run of the mill static files
       * handler, with the exception that, on watch
       * mode, we inject the watch script into
       * the document.
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
        let resolved = path.resolve("./", directory) + "\\"
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
              log(request.method + " - " + request.url)
              fs.readFile(resource, "utf8", (error, content) => {
                  content = (watch === true) ? inject_watch_script(content) : content
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
              log(request.method + " - " + request.url)
              let readstream = fs.createReadStream(resource)
              readstream.pipe(response)
              break;
          }
        })
      }         
    }
  })
}
