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
  const [loadingGifs, setLoadingGifs] = useState(false);
  const [inVideoCall, setInVideoCall] = useState(false);
  const messagesEndRef = useRef(null);

  // 🎤 Voice states
  const [isRecording, setIsRecording] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const [audioMessages, setAudioMessages] = useState([]);
  const [audioChunks, setAudioChunks] = useState([]);
  const [audioURL, setAudioURL] = useState(null);
  const [recordError, setRecordError] = useState("");

  // WebSocket ref
  const socketRef = useRef(null);

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
    socketRef.current = io(SOCKET_SERVER_URL);

    // Join the channel room
    socketRef.current.emit("join-channel", { serverName, channelName });

    // Listen for new messages
    socketRef.current.on("message-received", (message) => {
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

    // Cleanup on unmount or channel change
    return () => {
      if (socketRef.current) {
        socketRef.current.emit("leave-channel", { serverName, channelName });
        socketRef.current.disconnect();
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

      // Broadcast via WebSocket
      if (socketRef.current) {
        socketRef.current.emit("new-message", {
          serverName,
          channelName,
          message: newMessage,
        });
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

  // 🎙️ Start recording (RecordRTC-style)
  const startRecording = async () => {
    try {
      setRecordError("");
      // 🚨 Clear previous recording data
      if (audioChunks.length) setAudioChunks([]);
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
        setAudioURL(null);
      }
  
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        setAudioChunks(chunks);
        // stop mic tracks
        try {
          mediaRecorder.stream.getTracks().forEach((t) => t.stop());
        } catch {}
      };

      mediaRecorder.start();
      setRecorder(mediaRecorder);
      setIsRecording(true);
    } catch (err) {
      console.error("🎤 Failed to start recording:", err);
      setRecordError("Microphone permission denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (recorder) {
      recorder.stop();
      setIsRecording(false);
    }
  };

  const discardRecording = () => {
    try {
      if (audioURL) URL.revokeObjectURL(audioURL);
    } catch {}
    setAudioURL(null);
    setAudioChunks([]);
  };

  // ✅ Upload voice message
  const sendVoiceMessage = async () => {
    if (!audioChunks.length || !currentUser?.username) return;

    const blob = new Blob(audioChunks, { type: "audio/webm" });
    const formData = new FormData();
    // Backend expects field name `audio` (see FastAPI UploadFile param)
    formData.append("audio", blob, "voiceMessage.webm");
    formData.append("sender_username", currentUser.username);

    try {
      const res = await axios.post(
        ROUTES.SERVER_VOICE_UPLOAD(serverName, channelName),
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      console.log("✅ Voice message uploaded:", res.data);

      const newMessage = {
        id: Date.now().toString(),
        user: currentUser.username,
        profile_picture: currentUser.profile_picture,
        type: "voice",
        content: res.data.file_url,
        timestamp: new Date().toISOString(),
      };

      // Broadcast via WebSocket
      if (socketRef.current) {
        socketRef.current.emit("new-message", {
          serverName,
          channelName,
          message: newMessage,
        });
      }

      // reset
      try { if (audioURL) URL.revokeObjectURL(audioURL); } catch {}
      setAudioURL(null);
      setAudioChunks([]);
    } catch (err) {
      console.error("❌ Error uploading voice message:", err.response?.data || err);
      if (err.response?.status === 403) {
        alert("You must join this server to send voice messages!");
      } else {
        alert(`Failed to upload voice message: ${err.response?.data?.detail || err.message}`);
      }
    }
  };

  return (
    <Box display="flex" flexDirection="column" bgcolor="#36393f" height="100%">
      {/* Tabs - Fixed at top */}
      <Box px={2} pt={2}>
        <Tabs
          value={activeChannelType}
          onChange={(e, newValue) => {
            setActiveChannelType(newValue);
            setInVideoCall(false);
          }}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab label="Text" value="text" />
          <Tab label="Voice" value="voice" />
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

        {/* 🎙️ VOICE CHAT */}
        {activeChannelType === "voice" && (
          <>
            {/* Scrollable Voice Messages Area */}
            <Box 
              flex={1} 
              overflow="auto" 
              px={2}
              py={2}
              sx={{
                "&::-webkit-scrollbar": { width: "8px" },
                "&::-webkit-scrollbar-thumb": { 
                  backgroundColor: "#202225", 
                  borderRadius: "4px" 
                },
              }}
            >
              {messages
                .filter((msg) => msg.type === "voice")
                .map((msg) => (
                  <Box key={msg.id || msg.timestamp} mb={3} display="flex" gap={1.5}>
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
                      {msg.content && (
                        <audio 
                          controls 
                          src={msg.content} 
                          style={{ 
                            width: "100%", 
                            maxWidth: "400px",
                            height: "40px"
                          }} 
                        />
                      )}
                    </Box>
                  </Box>
                ))}
              {messages.filter((msg) => msg.type === "voice").length === 0 && (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <Typography color="#888">No voice messages yet.</Typography>
                </Box>
              )}
            </Box>

            {/* Fixed Recording Controls at Bottom */}
            <Box
  display="flex"
  flexDirection="column"
  alignItems="center"
  gap={1}
  px={2}
  py={2}
  sx={{
    borderTop: "1px solid #e0e0e0",
    bgcolor: "#ffffff",
    flexShrink: 0,
  }}
>
  {recordError && (
    <Typography color="#ff8b8b" variant="caption">
      {recordError}
    </Typography>
  )}

  <Button
    variant="contained"
    sx={{
      borderRadius: "50%",
      width: 80,
      height: 80,
      fontSize: 30,
      backgroundColor: isRecording ? "#ff8b8b" : "#ffffff",
      color: isRecording ? "#fff" : "#000",
      border: "2px solid #000",
      boxShadow: "0 0 10px rgba(0,0,0,0.15)",
      "&:hover": {
        backgroundColor: isRecording ? "#ff6b6b" : "#f5f5f5",
      },
    }}
    onClick={isRecording ? stopRecording : startRecording}
  >
    {isRecording ? "⏹️" : "🎤"}
  </Button>

  {audioURL && (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      gap={1}
      width="100%"
      maxWidth="400px"
    >
      <audio controls src={audioURL} style={{ width: "100%" }} />
      <Box display="flex" gap={1}>
        <Button
          variant="outlined"
          sx={{
            borderColor: "#000",
            color: "#000",
            "&:hover": {
              borderColor: "#555",
              color: "#555",
            },
          }}
          onClick={discardRecording}
        >
          Discard
        </Button>
        <Button
          variant="contained"
          sx={{
            backgroundColor: "#000",
            color: "#fff",
            "&:hover": {
              backgroundColor: "#333",
            },
          }}
          onClick={sendVoiceMessage}
        >
          Send
        </Button>
      </Box>
    </Box>
  )}
</Box>

          </>
        )}

        {/* 🎥 VIDEO CHAT */}
        {activeChannelType === "video" && (
          !inVideoCall ? (
            <Box flex={1} display="flex" justifyContent="center" alignItems="center">
              <Button
  variant="contained"
  onClick={() => setInVideoCall(true)}
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

            </Box>
          ) : (
            <Box flex={1} width="100%">
              <VideoCallComponent
                serverName={serverName}
                channelName={channelName}
                currentUser={currentUser}
                onLeaveCall={() => setInVideoCall(false)}
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
