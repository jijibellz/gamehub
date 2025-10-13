// VideoCallComponent.jsx
import { useEffect, useRef, useState } from "react";
import { Box, Typography, Fab } from "@mui/material";
import CallEndIcon from "@mui/icons-material/CallEnd";
import { io } from "socket.io-client";
import { SOCKET_SERVER_URL } from "../api/routes";

export default function VideoCallComponent({
  serverName,
  channelName,
  currentUser,
  onLeaveCall,
  onRoomFull,
}) {
  const localVideoRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [stream, setStream] = useState(null);
  const [isRoomFull, setIsRoomFull] = useState(false);

  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const remoteStreamsRef = useRef([]);

  const MAX_PARTICIPANTS = 20;

  const addOrUpdateRemoteStream = (socketId, remoteStream) => {
    const idx = remoteStreamsRef.current.findIndex(
      (s) => s.socketId === socketId
    );
    const updated =
      idx >= 0
        ? [
            ...remoteStreamsRef.current.slice(0, idx),
            { socketId, stream: remoteStream },
            ...remoteStreamsRef.current.slice(idx + 1),
          ]
        : [...remoteStreamsRef.current, { socketId, stream: remoteStream }];
    remoteStreamsRef.current = updated;
    setRemoteStreams(updated);
  };

  const removeRemoteStream = (socketId) => {
    const updated = remoteStreamsRef.current.filter(
      (s) => s.socketId !== socketId
    );
    remoteStreamsRef.current = updated;
    setRemoteStreams(updated);
  };

  useEffect(() => {
    let mounted = true;
    let localStream;

    const initCall = async () => {
      try {
        if (!currentUser?.username) return;

        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (!mounted) return;
        setStream(localStream);
        if (localVideoRef.current)
          localVideoRef.current.srcObject = localStream;

        socketRef.current = io(SOCKET_SERVER_URL, { transports: ["websocket"] });
        socketRef.current.emit("join_room", {
          roomId: channelName,
          userId: currentUser.username,
        });

        socketRef.current.on("user_joined", ({ userId, socketId }) => {
          if (socketId === socketRef.current.id) return;
          const pc = createPeerConnection(socketId, localStream);
          peerConnectionsRef.current = {
            ...peerConnectionsRef.current,
            [socketId]: pc,
          };
          (async () => {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socketRef.current.emit("offer", {
              to: socketId,
              offer,
              from: socketRef.current.id,
            });
          })();
        });

        socketRef.current.on("offer", async ({ from, offer }) => {
          const pc = createPeerConnection(from, localStream);
          peerConnectionsRef.current = {
            ...peerConnectionsRef.current,
            [from]: pc,
          };
          await pc.setRemoteDescription(offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socketRef.current.emit("answer", {
            to: from,
            answer,
            from: socketRef.current.id,
          });
        });

        socketRef.current.on("answer", async ({ from, answer }) => {
          const pc = peerConnectionsRef.current[from];
          if (pc) await pc.setRemoteDescription(answer);
        });

        socketRef.current.on("ice_candidate", async ({ from, candidate }) => {
          const pc = peerConnectionsRef.current[from];
          if (pc && candidate) await pc.addIceCandidate(candidate);
        });

        socketRef.current.on("user_left", ({ socketId }) => {
          const pc = peerConnectionsRef.current[socketId];
          if (pc) pc.close();
          delete peerConnectionsRef.current[socketId];
          removeRemoteStream(socketId);
        });
      } catch (err) {
        console.error(err);
      }
    };

    initCall();

    return () => {
      mounted = false;
      try {
        socketRef.current?.emit("leave_room", { roomId: channelName });
        socketRef.current?.disconnect();
      } catch {}
      localStream?.getTracks().forEach((t) => t.stop());
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      peerConnectionsRef.current = {};
      remoteStreamsRef.current = [];
      setRemoteStreams([]);
    };
  }, []);

  function createPeerConnection(remoteSocketId, localStream) {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });

    localStream?.getTracks().forEach((track) =>
      pc.addTrack(track, localStream)
    );

    pc.ontrack = (event) =>
      addOrUpdateRemoteStream(remoteSocketId, event.streams[0]);

    pc.onicecandidate = (event) => {
      if (event.candidate)
        socketRef.current.emit("ice_candidate", {
          to: remoteSocketId,
          candidate: event.candidate,
          from: socketRef.current.id,
        });
    };

    return pc;
  }

  const handleLeaveCall = () => {
    socketRef.current?.emit("leave_room", { roomId: channelName });
    socketRef.current?.disconnect();
    stream?.getTracks().forEach((t) => t.stop());
    Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
    peerConnectionsRef.current = {};
    remoteStreamsRef.current = [];
    setRemoteStreams([]);
    if (onLeaveCall) onLeaveCall();
  };

  const participants = [stream, ...remoteStreams.map((s) => s.stream)].filter(
    Boolean
  );
  const participantCount = participants.length;

  // Dynamic grid layout based on participant count
  const getGridLayout = (count) => {
    if (count <= 1) return { cols: 1, rows: 1 };
    if (count <= 2) return { cols: 2, rows: 1 };
    if (count <= 4) return { cols: 2, rows: 2 };
    if (count <= 6) return { cols: 3, rows: 2 };
    if (count <= 9) return { cols: 3, rows: 3 };
    return { cols: 4, rows: Math.ceil(count / 4) };
  };

  const gridLayout = getGridLayout(participantCount);

  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        bgcolor: "#111",
      }}
    >
      {/* Video Grid */}
      <Box
        sx={{
          flexGrow: 1,
          display: "grid",
          gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
          gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`,
          gap: 2,
          p: 2,
          overflow: "hidden",
          placeItems: "center",
          maxHeight: "calc(100vh - 100px)",
        }}
      >
        {stream && (
          <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 10,
                backgroundColor: "#000",
                objectFit: "cover",
                border: "2px solid #4CAF50",
              }}
            />
            <Typography
              variant="caption"
              sx={{
                position: "absolute",
                bottom: 8,
                left: 8,
                bgcolor: "rgba(0,0,0,0.7)",
                color: "white",
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: "0.75rem",
              }}
            >
              You ({participantCount})
            </Typography>
          </Box>
        )}
        {remoteStreams.map(({ socketId, stream }) => (
          <Box key={socketId} sx={{ width: "100%", height: "100%", position: "relative" }}>
            <video
              autoPlay
              playsInline
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 10,
                backgroundColor: "#000",
                objectFit: "cover",
                border: "2px solid #2196F3",
              }}
              ref={(el) => {
                if (el && stream && el.srcObject !== stream)
                  el.srcObject = stream;
              }}
            />
            <Typography
              variant="caption"
              sx={{
                position: "absolute",
                bottom: 8,
                left: 8,
                bgcolor: "rgba(0,0,0,0.7)",
                color: "white",
                px: 1,
                py: 0.5,
                borderRadius: 1,
                fontSize: "0.75rem",
              }}
            >
              User {socketId.slice(-4)}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Fixed bottom bar for End Call */}
      <Box
        sx={{
          position: "sticky",
          bottom: 0,
          width: "100%",
          bgcolor: "rgba(0,0,0,0.6)",
          py: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Fab
          color="error"
          aria-label="leave call"
          onClick={handleLeaveCall}
          sx={{
            boxShadow: "0 4px 20px rgba(244, 67, 54, 0.4)",
            transition: "0.2s",
            "&:hover": { transform: "scale(1.1)" },
          }}
        >
          <CallEndIcon />
        </Fab>
      </Box>
    </Box>
  );
}
