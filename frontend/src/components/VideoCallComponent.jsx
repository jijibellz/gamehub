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
  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const remoteStreamsRef = useRef([]);

  const addOrUpdateRemoteStream = (socketId, remoteStream) => {
    const idx = remoteStreamsRef.current.findIndex((s) => s.socketId === socketId);
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
    const updated = remoteStreamsRef.current.filter((s) => s.socketId !== socketId);
    remoteStreamsRef.current = updated;
    setRemoteStreams(updated);
  };

  useEffect(() => {
    let localStream;

    const init = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setStream(localStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }

        // connect to Socket.IO
        socketRef.current = io(SOCKET_SERVER_URL, {
          transports: ["websocket"],
        });

        socketRef.current.emit("join_room", {
          roomId: channelName,
          userId: currentUser.username,
        });

        // --- Handle room full
        socketRef.current.on("room-full", () => {
          onRoomFull?.(true);
        });

        // --- When another user joins
        socketRef.current.on("user-joined", async ({ socketId }) => {
          console.log("👋 New user joined:", socketId);
          const pc = createPeerConnection(socketId, localStream);

          peerConnectionsRef.current[socketId] = pc;

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socketRef.current.emit("offer", {
            to: socketId,
            offer,
          });
        });

        // --- When we receive an offer
        socketRef.current.on("offer", async ({ from, offer }) => {
          console.log("📩 Received offer from", from);
          const pc = createPeerConnection(from, localStream);
          peerConnectionsRef.current[from] = pc;

          await pc.setRemoteDescription(new RTCSessionDescription(offer));

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socketRef.current.emit("answer", {
            to: from,
            answer,
          });
        });

        // --- When we receive an answer
        socketRef.current.on("answer", async ({ from, answer }) => {
          console.log("📩 Received answer from", from);
          const pc = peerConnectionsRef.current[from];
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
          }
        });

        // --- When we receive ICE candidate
        socketRef.current.on("ice-candidate", async ({ from, candidate }) => {
          const pc = peerConnectionsRef.current[from];
          if (pc && candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
              console.log("🧊 Added ICE candidate from", from);
            } catch (err) {
              console.error("Error adding ICE candidate:", err);
            }
          }
        });

        // --- When a user leaves
        socketRef.current.on("user-left", ({ socketId }) => {
          console.log("👋 User left:", socketId);
          const pc = peerConnectionsRef.current[socketId];
          if (pc) pc.close();
          delete peerConnectionsRef.current[socketId];
          removeRemoteStream(socketId);
        });
      } catch (err) {
        console.error("Error initializing video call:", err);
      }
    };

    init();

    return () => {
      socketRef.current?.emit("leave_room", { roomId: channelName });
      socketRef.current?.disconnect();
      localStream?.getTracks().forEach((t) => t.stop());
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      peerConnectionsRef.current = {};
      remoteStreamsRef.current = [];
      setRemoteStreams([]);
    };
  }, []);

  // Helper to create PeerConnection
  function createPeerConnection(remoteSocketId, localStream) {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });

    localStream?.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("ice_candidate", {
          to: remoteSocketId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("🎥 Got remote track from", remoteSocketId);
      addOrUpdateRemoteStream(remoteSocketId, event.streams[0]);
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
    onLeaveCall?.();
  };

  const participants = [stream, ...remoteStreams.map((s) => s.stream)].filter(Boolean);
  const count = participants.length;
  const cols = count <= 2 ? 2 : Math.min(3, Math.ceil(Math.sqrt(count)));

  return (
    <Box sx={{ height: "100%", width: "100%", display: "flex", flexDirection: "column", bgcolor: "#111" }}>
      <Box
        sx={{
          flexGrow: 1,
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 2,
          p: 2,
          placeItems: "center",
        }}
      >
        {stream && (
          <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
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
            <Typography sx={{ position: "absolute", bottom: 8, left: 8, color: "#fff", bgcolor: "rgba(0,0,0,0.6)", px: 1, borderRadius: 1 }}>
              You
            </Typography>
          </Box>
        )}
        {remoteStreams.map(({ socketId, stream }) => (
          <Box key={socketId} sx={{ position: "relative", width: "100%", height: "100%" }}>
            <video
              autoPlay
              playsInline
              ref={(el) => {
                if (el && stream && el.srcObject !== stream) el.srcObject = stream;
              }}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: 10,
                backgroundColor: "#000",
                objectFit: "cover",
                border: "2px solid #2196F3",
              }}
            />
            <Typography sx={{ position: "absolute", bottom: 8, left: 8, color: "#fff", bgcolor: "rgba(0,0,0,0.6)", px: 1, borderRadius: 1 }}>
              {socketId.slice(-4)}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
        <Fab color="error" onClick={handleLeaveCall}>
          <CallEndIcon />
        </Fab>
      </Box>
    </Box>
  );
}
