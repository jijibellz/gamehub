const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const rooms = {}; // { roomId: [socketId, ...] }

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // 🎥 Video call room join
  socket.on("join-room", ({ roomId, userId }) => {
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push(socket.id);
    socket.join(roomId);

    // notify other users
    socket.to(roomId).emit("user-joined", { userId, socketId: socket.id });

    // offer/answer/ICE handling
    socket.on("offer", ({ to, offer, from }) => io.to(to).emit("offer", { offer, from }));
    socket.on("answer", ({ to, answer, from }) => io.to(to).emit("answer", { answer, from }));
    socket.on("ice-candidate", ({ to, candidate, from }) => io.to(to).emit("ice-candidate", { candidate, from }));

    socket.on("disconnect", () => {
      rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
      socket.to(roomId).emit("user-left", { userId, socketId: socket.id });
    });
  });

  // 💬 Chat message events
  socket.on("join-channel", ({ serverName, channelName }) => {
    const channelRoom = `${serverName}:${channelName}`;
    socket.join(channelRoom);
    console.log(`Socket ${socket.id} joined channel: ${channelRoom}`);
  });

  socket.on("leave-channel", ({ serverName, channelName }) => {
    const channelRoom = `${serverName}:${channelName}`;
    socket.leave(channelRoom);
    console.log(`Socket ${socket.id} left channel: ${channelRoom}`);
  });

  socket.on("new-message", ({ serverName, channelName, message }) => {
    const channelRoom = `${serverName}:${channelName}`;
    // Broadcast to all clients in this channel (including sender for consistency)
    io.to(channelRoom).emit("message-received", message);
    console.log(`Message broadcast to ${channelRoom}:`, message);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(5000, () => console.log("Signaling server running on port 5000"));
