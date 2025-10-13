import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  IconButton,
  Popover,
  Avatar,
} from "@mui/material";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import InsertPhotoIcon from "@mui/icons-material/InsertPhoto";
import axios from "axios";
import { ROUTES, API_BASE_URL, SOCKET_SERVER_URL } from "../api/routes";
import Picker from "emoji-picker-react";
import VideoCallComponent from "./VideoCallComponent";
import { io } from "socket.io-client";
import { getProfilePictureUrl } from "../utils/imageUtils";

export default function ServerChat({ serverName, channelName = "general", currentUser }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [activeChannelType, setActiveChannelType] = useState("text");
  const [emojiAnchor, setEmojiAnchor] = useState(null);
  const [gifAnchor, setGifAnchor] = useState(null);
  const [gifSearch, setGifSearch] = useState("");
  const [gifs, setGifs] = useState([]);
  const messagesEndRef = useRef(null);

  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoRoomFull, setIsVideoRoomFull] = useState(false);

  // Auto-scroll
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollToBottom, [messages]);

  // 📨 Fetch initial messages and setup WebSocket
  useEffect(() => {
    if (!currentUser) return;

    // Fetch initial messages
    const fetchMessages = async () => {
      try {
        const res = await axios.get(ROUTES.SERVER_MESSAGES(serverName, channelName));
        const mapped = res.data.map((m) => ({
          ...m,
          user: m.sender,
          profile_picture: m.profile_picture,
          content: m.type === "voice" ? `${API_BASE_URL}${m.content}` : m.content,
        }));
        setMessages(mapped);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    };
    fetchMessages();

    // Setup WebSocket connection
    const socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('✅ Connected to Socket.IO server');
      console.log('Socket ID:', socket.id);
      setIsConnected(true);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
      console.error('Error details:', {
        message: error.message,
        description: error.description,
        context: error.context,
        type: error.type
      });
      setIsConnected(false);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from Socket.IO server:', reason);
      setIsConnected(false);
    });

    socket.on('error', (error) => {
      console.error('❌ Socket.IO error:', error);
    });

    // Join the channel room
    socket.emit("join_channel", { serverName, channelName });

    // Listen for new messages
    socket.on("message-received", (message) => {
      console.log("📩 New message received:", message);
      setMessages((prev) => {
        // Avoid duplicates by checking if message already exists
        const exists = prev.some((m) =>
          m.id === message.id ||
          (m.timestamp === message.timestamp && m.user === message.user)
        );
        if (exists) return prev;

        return [
          ...prev,
          {
            ...message,
            content: message.type === "voice" ? `${API_BASE_URL}${message.content}` : message.content,
          },
        ];
      });
    });

    socketRef.current = socket;

    // Cleanup on unmount or channel change
    return () => {
      if (socketRef.current) {
        socket.emit("leave_channel", { serverName, channelName });
        socket.disconnect();
      }
    };
  }, [serverName, channelName, currentUser]);

  // 💬 Send text message
  const handleSend = async () => {
    if (!input.trim() || !currentUser?.username) return;
    try {
      const res = await axios.post(ROUTES.SERVER_MESSAGES(serverName, channelName), {
        sender_username: currentUser.username,
        content: input,
        type: "text",
      });

      const newMessage = {
        id: Date.now().toString(),
        user: currentUser.username,
        profile_picture: currentUser.profile_picture,
        type: "text",
        content: input,
        timestamp: new Date().toISOString(),
      };

      // Add message to local state immediately so user sees it right away
      setMessages((prev) => [...prev, newMessage]);

      // Broadcast via WebSocket (only if connected)
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit("new-message", {
          serverName,
          channelName,
          message: newMessage,
        });
      } else {
        console.warn('⚠️ Socket not connected, message may not be broadcast in real-time');
      }

      setInput("");
    } catch (err) {
      console.error("Failed to send message:", err);
      if (err.response?.status === 403) {
        alert("You must join this server to send messages!");
      } else {
        alert("Failed to send message. Please try again.");
      }
    }
  };

  // 😊 Emoji - keep picker open
  const handleEmojiClick = (emojiData) => {
    setInput((prev) => prev + emojiData.emoji);
    // Don't close the picker - let user click outside to close
  };

  // 🎬 GIF Search
  const searchGifs = async (query) => {
    if (!query.trim()) {
      // Load trending GIFs if no search
      query = "trending";
    }
    setLoadingGifs(true);
    try {
      // Using Tenor API (free, no key required for basic usage)
      const response = await axios.get(
        `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&limit=20`
      );
      setGifs(response.data.results || []);
    } catch (err) {
      console.error("Failed to fetch GIFs:", err);
      setGifs([]);
    } finally {
      setLoadingGifs(false);
    }
  };

  const handleGifClick = (gifUrl) => {
    setInput((prev) => prev + ` ${gifUrl} `);
    setGifAnchor(null);
  };

  // Load trending GIFs when GIF picker opens
  useEffect(() => {
    if (gifAnchor) {
      searchGifs("trending");
    }
  }, [gifAnchor]);

  return (
    <Box display="flex" flexDirection="column" bgcolor="#36393f" height="100%">
      {/* Connection Status Indicator */}
      <Box
        px={2}
        py={1}
        bgcolor={isConnected ? "#2e7d32" : "#d32f2f"}
        display="flex"
        alignItems="center"
        gap={1}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            bgcolor: isConnected ? "#4caf50" : "#f44336",
          }}
        />
        <Typography variant="caption" color="white">
          {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
        </Typography>
      </Box>

      {/* Tabs - Fixed at top */}
      <Box px={2} pt={2}>
        <Tabs
          value={activeChannelType}
          onChange={(e, newValue) => {
            setActiveChannelType(newValue);
            if (newValue !== "video") {
              setInVideoCall(false);
              setIsVideoRoomFull(false);
            }
          }}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label="Text" value="text" />
          <Tab label="Video" value="video" />
        </Tabs>
      </Box>

      {/* CONTENT - Takes remaining space */}
      <Box
        flex={1}
        display="flex"
        flexDirection="column"
        bgcolor="#2b2d31"
        m={2}
        borderRadius={1}
        overflow="hidden"
      >
        {/* 💬 TEXT CHAT */}
        {activeChannelType === "text" && (
          <>
            {/* Scrollable Messages Area */}
            <Box 
              flex={1} 
              overflow="auto" 
              px={2}
              sx={{
                "&::-webkit-scrollbar": { width: "8px" },
                "&::-webkit-scrollbar-thumb": { 
                  backgroundColor: "#202225", 
                  borderRadius: "4px" 
                },
              }}
            >
              {messages
                .filter((msg) => msg.type === "text")
                .map((msg) => {
                  // Check if message contains a GIF URL
                  const gifUrlMatch = msg.content.match(/(https?:\/\/[^\s]+\.gif[^\s]*)/i);
                  const hasGif = gifUrlMatch && gifUrlMatch[0];
                  
                  return (
                    <Box key={msg.id || msg.timestamp} mb={2} display="flex" gap={1.5}>
                      <Avatar 
                        sx={{ width: 40, height: 40, bgcolor: "#5865f2" }}
                        src={getProfilePictureUrl(msg.profile_picture)}
                      >
                        {msg.user?.[0]?.toUpperCase()}
                      </Avatar>
                      <Box flex={1}>
                        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                          <Typography variant="body2" color="white" fontWeight="bold">
                            {msg.user}
                          </Typography>
                          <Typography variant="caption" color="#888">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="#dcddde">
                          {hasGif ? msg.content.replace(hasGif, '') : msg.content}
                        </Typography>
                        {hasGif && (
                          <Box mt={1}>
                            <img 
                              src={hasGif} 
                              alt="GIF" 
                              style={{ 
                                maxWidth: '300px', 
                                maxHeight: '300px', 
                                borderRadius: '8px',
                                display: 'block'
                              }} 
                            />
                          </Box>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              <div ref={messagesEndRef} />
            </Box>

            {/* Fixed Input Box at Bottom */}
            <Box 
              display="flex" 
              gap={1} 
              alignItems="center" 
              px={2}
              py={1.5}
              sx={{ 
                borderTop: "1px solid #202225",
                bgcolor: "#2b2d31",
                flexShrink: 0
              }}
            >
              <IconButton onClick={(e) => setEmojiAnchor(e.currentTarget)} sx={{ bgcolor: "#2f3136" }}>
                <EmojiEmotionsIcon sx={{ color: "white" }} />
              </IconButton>
              <IconButton onClick={(e) => setGifAnchor(e.currentTarget)} sx={{ bgcolor: "#2f3136" }}>
                <InsertPhotoIcon sx={{ color: "white" }} />
              </IconButton>
              <TextField
                fullWidth
                size="small"
                placeholder={`Message #${channelName}`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                sx={{ bgcolor: "#2f3136", input: { color: "white" } }}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
              />
              <Button variant="contained" onClick={handleSend}>Send</Button>
            </Box>
          </>
        )}

        {/* 🎥 VIDEO CHAT */}
        {activeChannelType === "video" && (
          !inVideoCall ? (
            <Box flex={1} display="flex" justifyContent="center" alignItems="center">
              {isVideoRoomFull ? (
                <Box textAlign="center">
                  <Typography variant="h6" color="#ff6b6b" gutterBottom>
                    Video Call Room is Full
                  </Typography>
                  <Typography variant="body2" color="#888">
                    Maximum 20 participants allowed. Please try again later.
                  </Typography>
                </Box>
              ) : (
                <Button
                  variant="contained"
                  onClick={() => {
                    setInVideoCall(true);
                    setIsVideoRoomFull(false); // Reset when attempting to join
                  }}
                  sx={{
                    fontSize: 18,
                    px: 4,
                    py: 2,
                    backgroundColor: "white",
                    color: "black",
                    "&:hover": {
                      backgroundColor: "#f0f0f0",
                    },
                  }}
                >
                  Join Video Call
                </Button>
              )}
            </Box>
          ) : (
            <Box flex={1} width="100%">
              <VideoCallComponent
                serverName={serverName}
                channelName={channelName}
                currentUser={currentUser}
                onLeaveCall={() => {
                  setInVideoCall(false);
                  setIsVideoRoomFull(false);
                }}
                onRoomFull={() => setIsVideoRoomFull(true)}
              />
            </Box>
          )
        )}
      </Box>

      {/* Emoji Picker */}
      <Popover
        open={Boolean(emojiAnchor)}
        anchorEl={emojiAnchor}
        onClose={() => setEmojiAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Picker onEmojiClick={handleEmojiClick} />
      </Popover>

      {/* GIF Picker */}
      <Popover
        open={Boolean(gifAnchor)}
        anchorEl={gifAnchor}
        onClose={() => setGifAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ width: 400, maxHeight: 500, p: 2, bgcolor: "#2b2d31" }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search GIFs..."
            value={gifSearch}
            onChange={(e) => setGifSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchGifs(gifSearch)}
            sx={{ 
              mb: 2, 
              bgcolor: "#1e1f22",
              input: { color: "white" },
              "& .MuiOutlinedInput-root": {
                "& fieldset": { borderColor: "#444" },
                "&:hover fieldset": { borderColor: "#666" },
              }
            }}
          />
          <Button 
            fullWidth 
            variant="contained" 
            onClick={() => searchGifs(gifSearch)}
            sx={{ mb: 2 }}
          >
            Search
          </Button>
          {loadingGifs ? (
            <Box display="flex" justifyContent="center" p={2}>
              <Typography color="white">Loading GIFs...</Typography>
            </Box>
          ) : (
            <Box 
              sx={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(2, 1fr)", 
                gap: 1, 
                maxHeight: 350, 
                overflow: "auto",
                "&::-webkit-scrollbar": { width: "8px" },
                "&::-webkit-scrollbar-thumb": { backgroundColor: "#444", borderRadius: "4px" },
              }}
            >
              {gifs.map((gif) => (
                <Box
                  key={gif.id}
                  onClick={() => handleGifClick(gif.media_formats.gif.url)}
                  sx={{
                    cursor: "pointer",
                    borderRadius: 1,
                    overflow: "hidden",
                    "&:hover": { opacity: 0.8 },
                  }}
                >
                  <img
                    src={gif.media_formats.tinygif.url}
                    alt={gif.content_description}
                    style={{ width: "100%", display: "block" }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Popover>
    </Box>
  );
}
