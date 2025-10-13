const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = createServer(app);

// Configure CORS for Express
app.use(cors({
  origin: [
    "https://gamehubjiji-044p.onrender.com",
    "https://gamehubjijiplease.onrender.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
  ],
  credentials: true
}));

const io = new Server(server, {
  cors: {
    origin: [
      "https://gamehubjiji-044p.onrender.com",
      "https://gamehubjijiplease.onrender.com",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:3000",
      "http://127.0.0.1:3000"
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Room management
const activeConnections = {}; // socket_id → server/channel info
const channelRooms = {}; // "server:channel" → socket IDs
const videoCallRooms = {}; // roomId → socket IDs

// ======== VIDEO CALL EVENTS ========
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_room", (data) => {
    try {
      const roomId = data.roomId;
      const userId = data.userId;

      if (!roomId || !userId) {
        console.log("❌ Invalid join_room data:", data);
        return;
      }

      // Check room capacity (max 20 participants)
      const currentMembers = videoCallRooms[roomId] || new Set();
      if (currentMembers.size >= 20) {
        console.log(`❌ Room ${roomId} is full (max 20 participants)`);
        socket.emit("room-full", { roomId });
        return;
      }

      // Leave previous rooms
      for (const [room, members] of Object.entries(videoCallRooms)) {
        if (members.has(socket.id)) {
          socket.leave(room);
          members.delete(socket.id);
          if (members.size === 0) {
            delete videoCallRooms[room];
          }
        }
      }

      // Join new room
      socket.join(roomId);
      if (!videoCallRooms[roomId]) {
        videoCallRooms[roomId] = new Set();
      }
      videoCallRooms[roomId].add(socket.id);
      console.log(`${userId} (${socket.id}) joined video room ${roomId}`);

      // Notify others
      socket.to(roomId).emit("user-joined", { userId, socketId: socket.id });

    } catch (error) {
      console.error("❌ Error in join_room:", error);
    }
  });

  socket.on("offer", (data) => {
    try {
      const toSocket = data.to;
      const offer = data.offer;

      if (!toSocket || !offer) {
        console.log("❌ Invalid offer data:", data);
        return;
      }

      console.log(`Forwarding offer from ${socket.id} to ${toSocket}`);
      io.to(toSocket).emit("offer", { from: socket.id, offer });

    } catch (error) {
      console.error("❌ Error in offer:", error);
    }
  });

  socket.on("answer", (data) => {
    try {
      const toSocket = data.to;
      const answer = data.answer;

      if (!toSocket || !answer) {
        console.log("❌ Invalid answer data:", data);
        return;
      }

      console.log(`Forwarding answer from ${socket.id} to ${toSocket}`);
      io.to(toSocket).emit("answer", { from: socket.id, answer });

    } catch (error) {
      console.error("❌ Error in answer:", error);
    }
  });

  socket.on("ice-candidate", (data) => {
    try {
      const toSocket = data.to;
      const candidate = data.candidate;

      if (!toSocket || !candidate) {
        console.log("❌ Invalid ice-candidate data:", data);
        return;
      }

      console.log(`Forwarding ICE candidate from ${socket.id} to ${toSocket}`);
      io.to(toSocket).emit("ice-candidate", { from: socket.id, candidate });

    } catch (error) {
      console.error("❌ Error in ice-candidate:", error);
    }
  });

  socket.on("leave_room", (data) => {
    try {
      const roomId = data.roomId;
      if (!roomId) return;

      socket.leave(roomId);

      if (videoCallRooms[roomId]) {
        videoCallRooms[roomId].delete(socket.id);
        if (videoCallRooms[roomId].size === 0) {
          delete videoCallRooms[roomId];
        }
      }

      console.log(`${socket.id} left video room ${roomId}`);
      io.to(roomId).emit("user-left", { socketId: socket.id });

    } catch (error) {
      console.error("❌ Error in leave_room:", error);
    }
  });

  // ======== CHAT EVENTS ========
  socket.on("join_channel", (data) => {
    try {
      const serverName = data.serverName;
      const channelName = data.channelName;

      if (!serverName || !channelName) {
        console.log("❌ Invalid join_channel data:", data);
        return;
      }

      const roomKey = `${serverName}:${channelName}`;
      socket.join(roomKey);

      activeConnections[socket.id] = { serverName, channelName };
      if (!channelRooms[roomKey]) {
        channelRooms[roomKey] = new Set();
      }
      channelRooms[roomKey].add(socket.id);

      console.log(`${socket.id} joined ${roomKey} (${channelRooms[roomKey].size} users)`);

    } catch (error) {
      console.error("❌ Error in join_channel:", error);
    }
  });

  socket.on("leave_channel", (data) => {
    try {
      const serverName = data.serverName;
      const channelName = data.channelName;

      if (!serverName || !channelName) {
        return;
      }

      const roomKey = `${serverName}:${channelName}`;
      socket.leave(roomKey);

      if (channelRooms[roomKey]) {
        channelRooms[roomKey].delete(socket.id);
        if (channelRooms[roomKey].size === 0) {
          delete channelRooms[roomKey];
        }
      }

      delete activeConnections[socket.id];
      console.log(`${socket.id} left ${roomKey}`);

    } catch (error) {
      console.error("❌ Error in leave_channel:", error);
    }
  });

  socket.on("new-message", (data) => {
    try {
      const serverName = data.serverName;
      const channelName = data.channelName;
      const message = data.message;

      if (!serverName || !channelName || !message) {
        console.log("❌ Invalid new-message data:", data);
        return;
      }

      const roomKey = `${serverName}:${channelName}`;
      console.log(`📨 Broadcasting message to ${roomKey}: ${message.user} - ${message.content?.substring(0, 50)}...`);

      // Broadcast to all users in the channel room
      io.to(roomKey).emit("message-received", message);

    } catch (error) {
      console.error("❌ Error in new-message:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // Remove from chat channels
    if (activeConnections[socket.id]) {
      const info = activeConnections[socket.id];
      const roomKey = `${info.serverName}:${info.channelName}`;
      if (channelRooms[roomKey]) {
        channelRooms[roomKey].delete(socket.id);
        if (channelRooms[roomKey].size === 0) {
          delete channelRooms[roomKey];
        }
      }
      delete activeConnections[socket.id];
    }

    // Remove from video rooms
    for (const [roomId, members] of Object.entries(videoCallRooms)) {
      if (members.has(socket.id)) {
        members.delete(socket.id);
        io.to(roomId).emit("user-left", { socketId: socket.id });
        if (members.size === 0) {
          delete videoCallRooms[roomId];
        }
      }
    }
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Socket.IO server is running" });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 Socket.IO server running on port ${PORT}`);
});
