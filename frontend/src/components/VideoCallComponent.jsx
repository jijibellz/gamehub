// VideoCallComponent.jsx
import { useEffect, useRef, useState } from "react";
import { Box, Typography, Fab, Grid } from "@mui/material";
import CallEndIcon from "@mui/icons-material/CallEnd";
import { io } from "socket.io-client";
import { SOCKET_SERVER_URL } from "../api/routes";

export default function VideoCallComponent({ serverName, channelName, currentUser, onLeaveCall, onRoomFull }) {
  const localVideoRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [stream, setStream] = useState(null);
  const [isRoomFull, setIsRoomFull] = useState(false);

  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const remoteStreamsRef = useRef([]);

  const MAX_PARTICIPANTS = 20;

  const getGridCols = (count) => {
    if (count <= 1) return 1;
    if (count <= 2) return 2;
    if (count <= 4) return 2;
    if (count <= 6) return 3;
    if (count <= 9) return 3;
    if (count <= 12) return 4;
    if (count <= 16) return 4;
    return 5;
  };

  const addOrUpdateRemoteStream = (socketId, remoteStream) => {
    const idx = remoteStreamsRef.current.findIndex(s => s.socketId === socketId);
    const updated = [...remoteStreamsRef.current];
    if (idx >= 0) updated[idx] = { socketId, stream: remoteStream };
    else updated.push({ socketId, stream: remoteStream });
    remoteStreamsRef.current = updated;
    setRemoteStreams(updated);
  };

  const removeRemoteStream = (socketId) => {
    const updated = remoteStreamsRef.current.filter(s => s.socketId !== socketId);
    remoteStreamsRef.current = updated;
    setRemoteStreams(updated);
  };

  useEffect(() => {
    let mounted = true;
    let localStream;

    const initCall = async () => {
      try {
        if (!currentUser?.username) {
          console.error("Cannot join video call: missing currentUser.username");
          return;
        }

        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) return;
        setStream(localStream);
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

        socketRef.current = io(SOCKET_SERVER_URL, { transports: ["websocket"] });
        socketRef.current.emit("join_room", { roomId: channelName, userId: currentUser.username });

        socketRef.current.on("user-joined", ({ userId, socketId }) => {
          if (socketId === socketRef.current.id) return;
          if (peerConnectionsRef.current[socketId]) return;

          const pc = createPeerConnection(socketId, localStream);
          peerConnectionsRef.current = { ...peerConnectionsRef.current, [socketId]: pc };

          (async () => {
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socketRef.current.emit("offer", { to: socketId, offer, from: socketRef.current.id });
            } catch (err) {
              console.error("Error creating/sending offer:", err);
            }
          })();
        });

        socketRef.current.on("offer", async ({ from, offer }) => {
          if (peerConnectionsRef.current[from]) return;
          const pc = createPeerConnection(from, localStream);
          peerConnectionsRef.current = { ...peerConnectionsRef.current, [from]: pc };
          await pc.setRemoteDescription(offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketRef.current.emit("answer", { to: from, answer, from: socketRef.current.id });
        });

        socketRef.current.on("answer", async ({ from, answer }) => {
          const pc = peerConnectionsRef.current[from];
          if (!pc) return;
          await pc.setRemoteDescription(answer);
        });

        socketRef.current.on("ice-candidate", async ({ from, candidate }) => {
          if (!candidate || !from) return;
          const pc = peerConnectionsRef.current[from];
          if (pc) await pc.addIceCandidate(candidate);
        });

        socketRef.current.on("user-left", ({ socketId }) => {
          const pc = peerConnectionsRef.current[socketId];
          if (pc) pc.close();
          delete peerConnectionsRef.current[socketId];
          removeRemoteStream(socketId);
        });

        socketRef.current.on("room-full", () => {
          setIsRoomFull(true);
          onRoomFull?.();
          onLeaveCall?.();
        });
      } catch (err) {
        console.error("Error in initCall:", err);
      }
    };

    initCall();

    return () => {
      mounted = false;
      try {
        socketRef.current?.emit("leave_room", { roomId: channelName });
        socketRef.current?.disconnect();
      } catch (e) {}
      localStream?.getTracks().forEach(t => t.stop());
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      peerConnectionsRef.current = {};
      remoteStreamsRef.current = [];
      setRemoteStreams([]);
      setIsRoomFull(false);
    };
  }, []);

  function createPeerConnection(remoteSocketId, localStream) {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
      ],
    });

    localStream?.getTracks().forEach(track => pc.addTrack(track, localStream));

    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      addOrUpdateRemoteStream(remoteSocketId, remoteStream);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("ice_candidate", {
          to: remoteSocketId,
          candidate: event.candidate,
          from: socketRef.current.id,
        });
      }
    };

    return pc;
  }

  const handleLeaveCall = () => {
    socketRef.current?.emit("leave_room", { roomId: channelName });
    socketRef.current?.disconnect();
    stream?.getTracks().forEach(t => t.stop());
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};
    remoteStreamsRef.current = [];
    setRemoteStreams([]);
    setIsRoomFull(false);
    onLeaveCall?.();
  };

  const totalParticipants = remoteStreams.length + 1;
  const gridCols = getGridCols(totalParticipants);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "#1E1E1E" }}>
      <Fab
        color="error"
        aria-label="leave call"
        onClick={handleLeaveCall}
        sx={{ position: "fixed", top: 20, right: 20, zIndex: 1000 }}
      >
        <CallEndIcon />
      </Fab>

      <Box textAlign="center" p={2}>
        <Typography variant="h6" color="white">
          Video Call - {totalParticipants} participant{totalParticipants > 1 ? "s" : ""}
        </Typography>
      </Box>

      <Grid
        container
        spacing={2}
        justifyContent="center"
        alignItems="center"
        sx={{
          flexGrow: 1,
          overflowY: "auto",
          p: 2,
          justifyContent: "center",
        }}
      >
        {/* Local Video */}
        <Grid item xs={12 / gridCols} sm={6} md={4} lg={3} xl={2}>
          <Box sx={{ position: "relative" }}>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                borderRadius: "10px",
                backgroundColor: "#000",
                objectFit: "cover",
                border: "2px solid #4CAF50",
              }}
            />
            <Typography
              variant="caption"
              sx={{
                position: "absolute",
                bottom: 6,
                left: 6,
                bgcolor: "rgba(0,0,0,0.6)",
                color: "#fff",
                px: 1,
                borderRadius: 1,
              }}
            >
              You
            </Typography>
          </Box>
        </Grid>

        {/* Remote Videos */}
        {remoteStreams.map(({ socketId, stream }) => (
          <Grid key={socketId} item xs={12 / gridCols} sm={6} md={4} lg={3} xl={2}>
            <Box sx={{ position: "relative" }}>
              <video
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  borderRadius: "10px",
                  backgroundColor: "#000",
                  objectFit: "cover",
                  border: "2px solid #2196F3",
                }}
                ref={(el) => {
                  if (el && stream && el.srcObject !== stream) el.srcObject = stream;
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  position: "absolute",
                  bottom: 6,
                  left: 6,
                  bgcolor: "rgba(0,0,0,0.6)",
                  color: "#fff",
                  px: 1,
                  borderRadius: 1,
                }}
              >
                User {socketId.slice(-4)}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
