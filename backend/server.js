const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "https://gamehubjiji-044p.onrender.com", // your frontend
      "http://localhost:5173" // optional for local dev
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// --- your socket code goes here ---
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  // (copy your existing socket event handlers here)
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
