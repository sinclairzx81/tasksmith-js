/// <reference path="./typings/node/node.d.ts" />

import * as http from "http"
import * as fs   from "fs"

/**
 * replace with express, koa or similar.
 */
http.createServer((request, response) => {
  switch(request.url) {
    case "/": {
      let readstream = fs.createReadStream(__dirname + "/public/index.html")
      response.writeHead(200, {"Content-Type": "text/html"})
      readstream.pipe(response)
      break;
    }
    case "/scripts/app.js": {
      let readstream = fs.createReadStream(__dirname + "/public/scripts/app.js")
      response.writeHead(200, {"Content-Type": "text/javascript"})
      readstream.pipe(response)
      break;
    }
    case "/styles/style.css": {
      let readstream = fs.createReadStream(__dirname + "/public/styles/style.css")
      response.writeHead(200, {"Content-Type": "text/css"})
      readstream.pipe(response)
      break;
    }
    default:
      response.writeHead(200, {"Content-Type": "text/plain"})
      response.end("404 - not found")
      break;
  }
}).listen(5000)

console.log("server listening on port 5000")