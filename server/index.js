const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  console.log("📥 New client connected:", socket.id);

  socket.on("join-room", (roomId) => {
    console.log(`👋 ${socket.id} joining room: ${roomId}`);
    socket.join(roomId);

    // Notify others in the room
    socket.to(roomId).emit("user-joined", socket.id);

    // Handle incoming signal and relay
    socket.on("signal", ({ to, signal }) => {
      console.log(`📡 Relaying signal from ${socket.id} to ${to}`);
      io.to(to).emit("signal", { from: socket.id, signal });
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`❌ ${socket.id} disconnected`);
      socket.to(roomId).emit("user-disconnected", socket.id);
    });
  });
});

server.listen(5000, () => {
  console.log("🚀 Signaling server is running at http://localhost:5000");
});
