const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = 59801;

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

http
  .createServer((req, res) => {
    const urlPath = req.url === "/" ? "/dream-awakening-opening.html" : req.url;
    const safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, "");
    const filePath = path.join(root, safePath);

    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (err, buf) => {
      if (err) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": mime[ext] || "text/plain; charset=utf-8" });
      res.end(buf);
    });
  })
  .listen(port, "127.0.0.1", () => {
    console.log(`preview-server:http://127.0.0.1:${port}`);
  });
