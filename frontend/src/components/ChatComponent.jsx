import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, Avatar, Button, TextField, IconButton, Chip, Popover } from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import InsertPhotoIcon from "@mui/icons-material/InsertPhoto";
import axios from "axios";
import { API_BASE_URL, ROUTES } from "../api/routes";
import Picker from "emoji-picker-react";
import { getProfilePictureUrl } from "../utils/imageUtils";

export default function ChatComponent({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [emojiAnchor, setEmojiAnchor] = useState(null);
  const [gifAnchor, setGifAnchor] = useState(null);
  const [gifSearch, setGifSearch] = useState("");
  const [gifResults, setGifResults] = useState([]);
  const messagesEndRef = useRef(null);

  // Fetch users, friends, and pending requests
  useEffect(() => {
    if (!currentUser?.username) return;

    const fetchData = async () => {
      try {
        // Get all users
        const usersRes = await axios.get(ROUTES.GET_ALL_USERS(currentUser.username));
        setUsers(usersRes.data);

        // Get friends
        const friendsRes = await axios.get(ROUTES.GET_FRIENDS(currentUser.username));
        setFriends(friendsRes.data);

        // Get pending requests
        const requestsRes = await axios.get(ROUTES.GET_PENDING_REQUESTS(currentUser.username));
        setPendingRequests(requestsRes.data);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };

    fetchData();
  }, [currentUser]);

  const handleSendRequest = async (receiverUsername) => {
    try {
      await axios.post(ROUTES.SEND_FRIEND_REQUEST(receiverUsername, currentUser.username));
      alert("Friend request sent!");
      // Refresh users list
      const res = await axios.get(ROUTES.GET_ALL_USERS(currentUser.username));
      setUsers(res.data);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to send request");
    }
  };

  const handleAcceptRequest = async (senderUsername) => {
    try {
      await axios.post(ROUTES.ACCEPT_FRIEND_REQUEST(senderUsername, currentUser.username));
      alert("Friend request accepted!");
      // Refresh data
      const friendsRes = await axios.get(ROUTES.GET_FRIENDS(currentUser.username));
      setFriends(friendsRes.data);
      const requestsRes = await axios.get(ROUTES.GET_PENDING_REQUESTS(currentUser.username));
      setPendingRequests(requestsRes.data);
      const usersRes = await axios.get(ROUTES.GET_ALL_USERS(currentUser.username));
      setUsers(usersRes.data);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to accept request");
    }
  };

  const handleRejectRequest = async (senderUsername) => {
    try {
      await axios.post(ROUTES.REJECT_FRIEND_REQUEST(senderUsername, currentUser.username));
      alert("Friend request rejected");
      const requestsRes = await axios.get(ROUTES.GET_PENDING_REQUESTS(currentUser.username));
      setPendingRequests(requestsRes.data);
      const usersRes = await axios.get(ROUTES.GET_ALL_USERS(currentUser.username));
      setUsers(usersRes.data);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to reject request");
    }
  };

  // Emoji picker
  const handleEmojiClick = (emojiData) => {
    setInput((prev) => prev + emojiData.emoji);
  };

  // GIF search using Tenor API
  const handleGifSearch = async () => {
    if (!gifSearch.trim()) return;
    try {
      const res = await axios.get(
        `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(gifSearch)}&key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ&limit=20`
      );
      setGifResults(res.data.results || []);
    } catch (err) {
      console.error("GIF search failed:", err);
    }
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

  // Load messages for a friend
  const loadMessagesForFriend = async (friend) => {
    if (!currentUser || !friend) return;
    
    setLoadingMessages(true);
    try {
      const res = await axios.get(
        ROUTES.GET_DIRECT_MESSAGES(currentUser.username, friend.username)
      );
      setMessages(res.data);
    } catch (err) {
      console.error("Failed to load messages:", err);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !selectedFriend) return;
    
    try {
      const res = await axios.post(
        ROUTES.SEND_DIRECT_MESSAGE(currentUser.username, selectedFriend.username),
        { content: input }
      );
      
      const newMessage = {
        id: res.data.id,
        sender: currentUser.username,
        content: input,
        timestamp: res.data.timestamp,
      };
      
      setMessages((prev) => [...prev, newMessage]);
      setInput("");
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to send message");
    }
  };

  return (
    <Box display="flex" height="100%">
     {/* LEFT PANEL - Users List (30%) */}
<Box
  width="30%"
  bgcolor="#2b2d31"
  display="flex"
  flexDirection="column"
  height="100%"
  sx={{ borderRight: "1px solid #202225" }}
>
  {/* Friends Section */}
  <Box display="flex" flexDirection="column" height="50%">
    <Box
      p={2}
      sx={{
        borderBottom: "1px solid #202225",
        flexShrink: 0,
      }}
    >
      <Typography variant="h6" color="white">
        Friends
      </Typography>
    </Box>

    {/* Scrollable Friends List */}
    <Box
      flex={1}
      overflow="auto"
      p={2}
      sx={{
        "&::-webkit-scrollbar": { width: "8px" },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: "#202225",
          borderRadius: "4px",
        },
      }}
    >
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Box mb={3}>
          <Typography variant="subtitle2" color="#aaa" mb={1}>
            Pending Requests ({pendingRequests.length})
          </Typography>
          {pendingRequests.map((req) => (
            <Box
              key={req.username}
              display="flex"
              alignItems="center"
              gap={1}
              mb={2}
              p={1}
              bgcolor="#202225"
              borderRadius={1}
            >
              <Avatar
                src={getProfilePictureUrl(req.profile_picture)}
                sx={{ width: 40, height: 40 }}
              >
                {req.username[0].toUpperCase()}
              </Avatar>
              <Box flex={1}>
                <Typography color="white" variant="body2">
                  {req.username}
                </Typography>
              </Box>
              <IconButton
                size="small"
                onClick={() => handleAcceptRequest(req.username)}
                sx={{ color: "#4caf50" }}
              >
                <CheckIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => handleRejectRequest(req.username)}
                sx={{ color: "#f44336" }}
              >
                <CloseIcon />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      {/* Friends List */}
      {friends.length > 0 ? (
        <>
          <Typography variant="subtitle2" color="#aaa" mb={1}>
            Your Friends ({friends.length})
          </Typography>
          {friends.map((friend) => (
            <Box
              key={friend.username}
              display="flex"
              alignItems="center"
              gap={1.5}
              mb={1}
              p={1.5}
              bgcolor={
                selectedFriend?.username === friend.username
                  ? "#404249"
                  : "transparent"
              }
              borderRadius={1}
              sx={{
                cursor: "pointer",
                "&:hover": { bgcolor: "#35373c" },
              }}
              onClick={() => {
                setSelectedFriend(friend);
                loadMessagesForFriend(friend);
              }}
            >
              <Avatar
                src={getProfilePictureUrl(friend.profile_picture)}
                sx={{ width: 40, height: 40 }}
              >
                {friend.username[0].toUpperCase()}
              </Avatar>
              <Box flex={1}>
                <Typography color="white" variant="body2">
                  {friend.username}
                </Typography>
                {friend.bio && (
                  <Typography color="#888" variant="caption" noWrap>
                    {friend.bio}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </>
      ) : (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          height="100%"
        >
          <Typography color="#888" variant="body2">
            No friends yet
          </Typography>
        </Box>
      )}
    </Box>
  </Box>

  {/* All Users Section */}
  <Box display="flex" flexDirection="column" height="50%">
    <Box
      p={2}
      sx={{
        borderBottom: "1px solid #202225",
        flexShrink: 0,
      }}
    >
      <Typography variant="h6" color="white">
        All Users
      </Typography>
    </Box>

    {/* Scrollable Non-Friends List */}
    <Box
      flex={1}
      overflow="auto"
      p={2}
      sx={{
        "&::-webkit-scrollbar": { width: "8px" },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: "#202225",
          borderRadius: "4px",
        },
      }}
    >
      {users
        .filter((u) => u.status !== "friends")
        .map((user) => (
          <Box
            key={user.username}
            display="flex"
            alignItems="center"
            gap={1.5}
            mb={1}
            p={1.5}
            bgcolor="#202225"
            borderRadius={1}
          >
            <Avatar
              src={getProfilePictureUrl(user.profile_picture)}
              sx={{ width: 40, height: 40 }}
            >
              {user.username[0].toUpperCase()}
            </Avatar>
            <Box flex={1} minWidth={0}>
              <Typography color="white" variant="body2">
                {user.username}
              </Typography>
              {user.bio && (
                <Typography color="#888" variant="caption" noWrap>
                  {user.bio}
                </Typography>
              )}
            </Box>
            {user.status === "none" && (
              <IconButton
                size="small"
                onClick={() => handleSendRequest(user.username)}
                sx={{ color: "white" }}
              >
                <PersonAddIcon />
              </IconButton>
            )}
            {user.status === "pending_sent" && (
              <Chip label="Pending" size="small" />
            )}
            {user.status === "pending_received" && (
              <Chip label="Accept?" size="small" color="warning" />
            )}
          </Box>
        ))}
    </Box>
  </Box>
</Box>

      {/* RIGHT PANEL - Chat Box (70%) */}
      <Box flex={1} display="flex" flexDirection="column" bgcolor="#313338" height="100%">
        {selectedFriend ? (
          <>
            {/* Chat Header */}
            <Box p={2} display="flex" alignItems="center" gap={2} sx={{ borderBottom: "1px solid #202225" }}>
              <Avatar src={getProfilePictureUrl(selectedFriend.profile_picture)} sx={{ width: 48, height: 48 }}>
                {selectedFriend.username[0].toUpperCase()}
              </Avatar>
              <Box>
                <Typography color="white" variant="h6">{selectedFriend.username}</Typography>
                {selectedFriend.bio && <Typography color="#aaa" variant="caption">{selectedFriend.bio}</Typography>}
              </Box>
            </Box>

            {/* Scrollable Messages Area */}
            <Box 
              flex={1} 
              overflow="auto" 
              px={2}
              py={2}
              sx={{
                "&::-webkit-scrollbar": { width: "8px" },
                "&::-webkit-scrollbar-thumb": { backgroundColor: "#202225", borderRadius: "4px" },
              }}
            >
              {messages.map((msg) => {
                // Check if message contains a GIF URL
                const gifUrlMatch = msg.content.match(/(https?:\/\/[^\s]+\.gif[^\s]*)/i);
                const hasGif = gifUrlMatch && gifUrlMatch[0];
                
                // Get sender's profile picture
                const senderProfilePic = msg.sender === currentUser.username 
                  ? currentUser.profile_picture 
                  : selectedFriend.profile_picture;
                
                return (
                  <Box key={msg.id} mb={2} display="flex" gap={1.5}>
                    <Avatar 
                      sx={{ width: 40, height: 40, bgcolor: "#5865f2" }}
                      src={senderProfilePic ? `${API_BASE_URL}${senderProfilePic}` : ""}
                    >
                      {msg.sender[0].toUpperCase()}
                    </Avatar>
                    <Box flex={1}>
                      <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                        <Typography variant="body2" color="white" fontWeight="bold">{msg.sender}</Typography>
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
              {messages.length === 0 && (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <Typography color="#888">No messages yet. Start the conversation!</Typography>
                </Box>
              )}
              <div ref={messagesEndRef} />
            </Box>

            {/* Fixed Input Box */}
            <Box display="flex" gap={1} alignItems="center" px={2} py={1.5} sx={{ borderTop: "1px solid #202225", bgcolor: "#313338", flexShrink: 0 }}>
              <IconButton onClick={(e) => setEmojiAnchor(e.currentTarget)} sx={{ bgcolor: "#2f3136" }}>
                <EmojiEmotionsIcon sx={{ color: "white" }} />
              </IconButton>
              <IconButton onClick={(e) => setGifAnchor(e.currentTarget)} sx={{ bgcolor: "#2f3136" }}>
                <InsertPhotoIcon sx={{ color: "white" }} />
              </IconButton>
              <TextField
                fullWidth
                size="small"
                placeholder={`Message @${selectedFriend.username}`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                sx={{ bgcolor: "#2b2d31", input: { color: "white" } }}
              />
              <Button variant="contained" onClick={handleSendMessage}>Send</Button>
            </Box>

            {/* Emoji Picker Popover */}
            <Popover open={Boolean(emojiAnchor)} anchorEl={emojiAnchor} onClose={() => setEmojiAnchor(null)} anchorOrigin={{ vertical: "top", horizontal: "left" }}>
              <Picker onEmojiClick={handleEmojiClick} />
            </Popover>

            {/* GIF Picker Popover */}
            <Popover open={Boolean(gifAnchor)} anchorEl={gifAnchor} onClose={() => setGifAnchor(null)} anchorOrigin={{ vertical: "top", horizontal: "left" }}>
              <Box p={2} width={300}>
                <TextField 
                  fullWidth 
                  size="small" 
                  placeholder="Search GIFs..." 
                  value={gifSearch} 
                  onChange={(e) => setGifSearch(e.target.value)} 
                  onKeyDown={(e) => e.key === "Enter" && handleGifSearch()} 
                  sx={{ mb: 1 }} 
                />
                <Box maxHeight={300} overflow="auto">
                  {gifResults.map((gif) => (
                    <Box 
                      key={gif.id} 
                      onClick={() => handleGifSelect(gif.media_formats?.gif?.url || gif.url)} 
                      sx={{ cursor: "pointer", mb: 1 }}
                    >
                      <img 
                        src={gif.media_formats?.tinygif?.url || gif.media_formats?.gif?.url} 
                        alt={gif.content_description} 
                        style={{ width: "100%", borderRadius: "4px" }} 
                      />
                    </Box>
                  ))}
                </Box>
              </Box>
            </Popover>
          </>
        ) : (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <Typography color="#888" variant="h6">Select a friend to start chatting</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
