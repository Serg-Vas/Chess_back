// // const http = require('http');
// // const port = 3001;
// // http.createServer((req, res) => {
// //   res.writeHead(200, {
// //     'Content-Type': 'text/event-stream',
// //     'Cache-Control': 'no-cache',
// //     'Connection': 'keep-alive'
// //   });

// //   setInterval(() => {
// //     res.write(`data: ${new Date().toLocaleTimeString()}\n\n`);
// //   }, 1000);
// // }).listen(port, () => {
// //   console.log(`Server running at http://localhost:${port}/`);
// // });

// import { createServer } from "http";
// import next from "next";
// import { Server } from "socket.io";
// import { setupChessSocket } from "./src/sockets/chessSocket.js";

// const dev = process.env.NODE_ENV !== "production";
// const app = next({ dev });
// const handle = app.getRequestHandler();

// const port = 3002;

// app.prepare().then(() => {  
//   const httpServer = createServer((req, res) => {
//     handle(req, res);
//   });

//   const io = new Server(httpServer, {
//     cors: {
//       origin: "http://localhost:5173",
//       methods: ["GET", "POST"],
//       credentials: true,
//     },
//   });

//   setupChessSocket(io);

//   httpServer.listen(port, () => {
//     console.log(`🚀 Next.js + Socket.IO server running on http://localhost:${port}`);
//   });
// });
