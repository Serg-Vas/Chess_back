const http = require('http');
const port = 3001;
http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  setInterval(() => {
    res.write(`data: ${new Date().toLocaleTimeString()}\n\n`);
  }, 1000);
}).listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});