import React, { useState, useEffect } from "react";
import { Box, Typography, Button, TextField, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { useParams } from "react-router-dom";
import LeftSidebar from "../components/LeftSidebar";
import RightSidebar from "../components/RightSidebar";
import ServerChat from "../components/ServerChat";
import axios from "axios";
import { ROUTES } from "../api/routes";

export default function ChannelPage() {
  const { serverName } = useParams(); // <-- grab server name from URL
  const [currentUser, setCurrentUser] = useState(null);
  const [server, setServer] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [isMember, setIsMember] = useState(false);
  const [checkingMembership, setCheckingMembership] = useState(true);

  // Load logged-in user
  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
  }, []);

  // Fetch the selected server
  useEffect(() => {
    if (!serverName) return;

    const fetchServer = async () => {
      try {
        const res = await axios.get(`${ROUTES.SERVERS_LIST}${serverName}`);
        setServer(res.data);
        setSelectedChannel(res.data.channels[0]?.name || null);
      } catch (err) {
        console.error("Failed to fetch server:", err);
      }
    };

    fetchServer();
  }, [serverName]);

  // Check membership status
  useEffect(() => {
    if (!serverName || !currentUser?.username) return;

    const checkMembership = async () => {
      setCheckingMembership(true);
      try {
        const res = await axios.get(ROUTES.CHECK_MEMBERSHIP(serverName, currentUser.username));
        setIsMember(res.data.is_member);
      } catch (err) {
        console.error("Failed to check membership:", err);
        setIsMember(false);
      } finally {
        setCheckingMembership(false);
      }
    };

    checkMembership();
  }, [serverName, currentUser]);

  // Join server
  const handleJoinServer = async () => {
    if (!currentUser?.username) return;

    try {
      await axios.post(ROUTES.JOIN_SERVER(serverName), null, {
        params: { username: currentUser.username }
      });
      setIsMember(true);
    } catch (err) {
      console.error("Failed to join server:", err);
      alert("Failed to join server. Please try again.");
    }
  };

  // Leave server
  const handleLeaveServer = async () => {
    if (!currentUser?.username) return;

    try {
      await axios.post(ROUTES.LEAVE_SERVER(serverName), null, {
        params: { username: currentUser.username }
      });
      setIsMember(false);
    } catch (err) {
      console.error("Failed to leave server:", err);
      alert("Failed to leave server. Please try again.");
    }
  };

  // Create a new channel
  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;

    try {
      const res = await axios.post(
        ROUTES.SERVER_CHANNELS(server.name),
        { name: newChannelName, type: "text" }
      );
      setServer((prev) => ({
        ...prev,
        channels: [...prev.channels, res.data],
      }));
      setNewChannelName("");
      setOpenDialog(false);
    } catch (err) {
      console.error("Failed to create channel:", err);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        bgcolor: "#0b0c0d",
      }}
    >
      {/* LEFT SIDEBAR */}
      <Box
        sx={{
          width: 80,
          bgcolor: "#2b2d31",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 2,
          height: "100%",
        }}
      >
        <LeftSidebar style={{ flex: 1, width: "100%" }} />
      </Box>

      {/* SERVER & CHANNEL SIDEBAR */}
      <Box
        sx={{
          width: 220,
          bgcolor: "#2b2d31",
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          height: "100%",
          overflowY: "auto",
        }}
      >
        {/* Server Name */}
        <Typography color="white" variant="h6">
          {server?.name || "Loading..."}
        </Typography>

        {/* Member Status & Leave Button */}
        {isMember && (
          <Box display="flex" alignItems="center" gap={1}>
            <Typography color="#4caf50" variant="caption" sx={{ flex: 1 }}>
              ✓ Member
            </Typography>
            <Button 
              size="small" 
              variant="outlined" 
              color="error"
              onClick={handleLeaveServer}
              sx={{ fontSize: '0.7rem', py: 0.5 }}
            >
              Leave
            </Button>
          </Box>
        )}

        {/* Channels Header with + button */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography color="white" variant="subtitle1">
            Channels
          </Typography>
          <Button size="small" variant="outlined" onClick={() => setOpenDialog(true)}>
            +
          </Button>
        </Box>

        {/* List of Channels */}
        {server?.channels.map((channel) => (
          <Box
            key={channel.name}
            onClick={() => setSelectedChannel(channel.name)}
            sx={{
              p: 1,
              cursor: "pointer",
              bgcolor: selectedChannel === channel.name ? "#444" : "transparent",
              borderRadius: 1,
              color: "white",
              "&:hover": { bgcolor: "#555" },
            }}
          >
            #{channel.name}
          </Box>
        ))}
      </Box>

      {/* MAIN CHAT PANEL */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          bgcolor: "#313338",
          p: 2,
          height: "100%",
          "&::-webkit-scrollbar": { width: "8px" },
          "&::-webkit-scrollbar-thumb": { backgroundColor: "#555", borderRadius: "4px" },
        }}
      >
        {checkingMembership ? (
          <Box color="white" textAlign="center" mt={4}>
            <Typography>Checking membership...</Typography>
          </Box>
        ) : !isMember ? (
          <Box 
            display="flex" 
            flexDirection="column" 
            alignItems="center" 
            justifyContent="center" 
            height="100%"
            gap={2}
          >
            <Typography variant="h5" color="white">
              Welcome to {server?.name}!
            </Typography>
            <Typography color="#aaa">
              You need to join this server to view channels and send messages.
            </Typography>
            <Button 
              variant="contained" 
              size="large"
              onClick={handleJoinServer}
              sx={{ mt: 2, px: 4, py: 1.5 }}
            >
              Join Server
            </Button>
          </Box>
        ) : currentUser && server && selectedChannel ? (
          <ServerChat
            serverName={server.name}
            channelName={selectedChannel}
            currentUser={currentUser}
          />
        ) : (
          <Box color="white" textAlign="center" mt={4}>
            Please select a channel to start chatting.
          </Box>
        )}
      </Box>

      {/* RIGHT SIDEBAR */}
      <Box
        sx={{
          width: 260,
          bgcolor: "#2b2d31",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          p: 2,
          height: "100%",
        }}
      >
        <RightSidebar style={{ flex: 1, width: "100%" }} />
      </Box>

      {/* Dialog to create new channel */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Create New Channel</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Channel Name"
            fullWidth
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateChannel}>Create</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
