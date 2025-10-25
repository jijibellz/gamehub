// VideoCallComponent.jsx
import { useEffect, useRef, useState } from "react";
import { Box, Typography, Fab } from "@mui/material";
import CallEndIcon from "@mui/icons-material/CallEnd";
import { io } from "socket.io-client";
import { SOCKET_SERVER_URL } from "../api/routes";

export default function VideoCallComponent({ serverName, channelName, currentUser, onLeaveCall, onRoomFull }) {
  const localVideoRef = useRef(null);

  // State for window dimensions to trigger re-renders on resize
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  });

  // refs for mutable values used in callbacks
  const socketRef = useRef(null);
  const peerConnectionsRef = useRef({}); // { socketId: RTCPeerConnection }
  const remoteStreamsRef = useRef([]); // mirror of remoteStreams to avoid closure issues

  // Constants for dynamic sizing and layout optimization
  const MAX_PARTICIPANTS = 20;
  const getOptimalGridLayout = (participantCount) => {
    // Calculate optimal grid dimensions based on participant count
    if (participantCount <= 1) return { rows: 1, cols: 1 };
    if (participantCount <= 4) return { rows: 2, cols: 2 };
    if (participantCount <= 9) return { rows: 3, cols: 3 };
    if (participantCount <= 16) return { rows: 4, cols: 4 };
    return { rows: 5, cols: 4 }; // For 17-20 participants, 5 rows x 4 cols
  };

  const getVideoSize = (participantCount, gridLayout) => {
    // Calculate video size based on available space and grid layout
    const containerWidth = windowSize.width * 0.9; // 90% of viewport width
    const containerHeight = windowSize.height * 0.7; // 70% of viewport height

    const { rows, cols } = gridLayout;
    const totalCells = rows * cols;

    // Calculate optimal size to fit all videos in the grid
    const videoWidth = Math.floor((containerWidth - (cols - 1) * 16) / cols); // 16px gap
    const videoHeight = Math.floor((containerHeight - (rows - 1) * 16) / rows); // 16px gap

    // Take the smaller dimension to maintain aspect ratio
    const size = Math.min(videoWidth, videoHeight);

    // Apply minimum and maximum constraints
    return {
      width: Math.max(120, Math.min(size, 400)), // Min 120px, Max 400px
      height: Math.max(90, Math.min(size, 300))   // Min 90px, Max 300px
    };
  };

  // helper to update both ref + state
  const addOrUpdateRemoteStream = (socketId, remoteStream) => {
    const idx = remoteStreamsRef.current.findIndex(s => s.socketId === socketId);
    if (idx >= 0) {
      const updated = [...remoteStreamsRef.current];
      updated[idx] = { socketId, stream: remoteStream };
      remoteStreamsRef.current = updated;
      setRemoteStreams(updated);
    } else {
      const updated = [...remoteStreamsRef.current, { socketId, stream: remoteStream }];
      remoteStreamsRef.current = updated;
      setRemoteStreams(updated);

      // Check if room is now full
      if (updated.length >= MAX_PARTICIPANTS) {
        setIsRoomFull(true);
      }
    }
  };

  const removeRemoteStream = (socketId) => {
    const updated = remoteStreamsRef.current.filter(s => s.socketId !== socketId);
    remoteStreamsRef.current = updated;
    setRemoteStreams(updated);

    // Check if room is no longer full
    if (updated.length < MAX_PARTICIPANTS) {
      setIsRoomFull(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let localStream;

    // Window resize handler
    const handleResize = () => {
      if (mounted) {
        setWindowSize({
          width: window.innerWidth,
          height: window.innerHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);

    const initCall = async () => {
      try {
        if (!currentUser?.username) {
          console.error("Cannot join video call: missing currentUser.username");
          return;
        }

        // get local media
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) return;
        setStream(localStream);
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

        // connect to signaling server
        socketRef.current = io(SOCKET_SERVER_URL, {
          transports: ["websocket"],
        });

        // Emit join_room (server expects join_room)
        socketRef.current.emit("join_room", {
          roomId: channelName,
          userId: currentUser.username,
        });

        // When a new user joins the room (other clients receive this)
        socketRef.current.on("user-joined", ({ userId, socketId }) => {
          console.log("🆕 New user joined:", userId, socketId);

          // don't connect to self
          if (socketId === socketRef.current.id) return;

          // if already have pc skip
          if (peerConnectionsRef.current[socketId]) {
            console.log("Already have PC for", socketId);
            return;
          }

          // create pc as existing participant (we will be the caller to the newcomer)
          const pc = createPeerConnection(socketId, localStream);

          peerConnectionsRef.current = { ...peerConnectionsRef.current, [socketId]: pc };

          // create offer and send to the newcomer
          (async () => {
            try {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socketRef.current.emit("offer", {
                to: socketId,
                offer,
                from: socketRef.current.id,
              });
              console.log("📤 Offer sent to", socketId);
            } catch (err) {
              console.error("Error creating/sending offer:", err);
            }
          })();
        });

        // Handle incoming offer (we are callee)
        socketRef.current.on("offer", async ({ from, offer }) => {
          console.log("📥 Received offer from", from);

          // If pc already exists, ignore duplicate (or optionally replace)
          if (peerConnectionsRef.current[from]) {
            console.log("Duplicate offer: PC already exists for", from);
            return;
          }

          const pc = createPeerConnection(from, localStream);
          peerConnectionsRef.current = { ...peerConnectionsRef.current, [from]: pc };

          try {
            await pc.setRemoteDescription(offer);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            // send answer back (server expects 'answer' event)
            socketRef.current.emit("answer", {
              to: from,
              answer,
              from: socketRef.current.id,
            });
            console.log("📤 Answer sent to", from);
          } catch (err) {
            console.error("Error handling offer from", from, err);
          }
        });

        // Handle incoming answer (caller receives this)
        socketRef.current.on("answer", async ({ from, answer }) => {
          console.log("📥 Received answer from", from);
          const pc = peerConnectionsRef.current[from];
          if (!pc) {
            console.warn("No PC found for answer from", from);
            return;
          }
          try {
            await pc.setRemoteDescription(answer);
          } catch (err) {
            console.error("Error setting remote description for answer:", err);
          }
        });

        // Server forwards ICE as event name "ice-candidate" (hyphen) — we listen for that
        socketRef.current.on("ice-candidate", async ({ from, candidate }) => {
          // sanity
          if (!candidate || !from) return;
          const pc = peerConnectionsRef.current[from];
          if (!pc) {
            console.warn("No PC when receiving candidate from", from);
            return;
          }
          try {
            await pc.addIceCandidate(candidate);
          } catch (err) {
            console.error("Error adding ICE candidate:", err);
          }
        });

        // When someone leaves
        socketRef.current.on("user-left", ({ socketId }) => {
          console.log("User left:", socketId);
          const pc = peerConnectionsRef.current[socketId];
          if (pc) {
            try { pc.close(); } catch (e) {}
            const copy = { ...peerConnectionsRef.current };
            delete copy[socketId];
            peerConnectionsRef.current = copy;
          }
          removeRemoteStream(socketId);
        });

        // Handle room full event
        socketRef.current.on("room-full", ({ roomId }) => {
          console.log("❌ Room is full:", roomId);
          setIsRoomFull(true);
          if (onRoomFull) onRoomFull();
          if (onLeaveCall) onLeaveCall();
        });
      } catch (err) {
        console.error("Error in initCall:", err);
      }
    };

    initCall();

    return () => {
      mounted = false;
      window.removeEventListener('resize', handleResize);
      // cleanup
      try {
        if (socketRef.current) {
          socketRef.current.emit("leave_room", { roomId: channelName });
          socketRef.current.disconnect();
        }
      } catch (e) {}
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
      // close all peer connections
      Object.values(peerConnectionsRef.current).forEach(pc => {
        try { pc.close(); } catch (e) {}
      });
      peerConnectionsRef.current = {};
      remoteStreamsRef.current = [];
      setRemoteStreams([]);
      setIsRoomFull(false); // Reset room full state on cleanup
    };
  }, []);

  function createPeerConnection(remoteSocketId, localStream) {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject',
        },
      ],
      iceCandidatePoolSize: 10,
    });

    // add local tracks
    if (localStream) {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    // when remote track(s) received
    pc.ontrack = (event) => {
      if (!event.streams || event.streams.length === 0) {
        console.warn("No streams on ontrack for", remoteSocketId);
        return;
      }
      const remoteStream = event.streams[0];
      addOrUpdateRemoteStream(remoteSocketId, remoteStream);
      console.log("Received remote stream for", remoteSocketId, "tracks:", remoteStream.getTracks().length);
    };

    // send ICE candidates to the other peer
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("ice_candidate", {
          to: remoteSocketId,
          candidate: event.candidate,
          from: socketRef.current.id,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state (${remoteSocketId}):`, pc.connectionState);
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        // optional: try restart or cleanup
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`ICE state (${remoteSocketId}):`, pc.iceConnectionState);
    };

    return pc;
  }

  const handleLeaveCall = () => {
    try {
      if (socketRef.current) socketRef.current.emit("leave_room", { roomId: channelName });
      if (socketRef.current) socketRef.current.disconnect();
    } catch (e) {}
    if (stream) stream.getTracks().forEach(t => t.stop());
    Object.values(peerConnectionsRef.current).forEach(pc => {
      try { pc.close(); } catch (e) {}
    });
    peerConnectionsRef.current = {};
    remoteStreamsRef.current = [];
    setRemoteStreams([]);
    setIsRoomFull(false); // Reset room full state
    if (onLeaveCall) onLeaveCall();
  };

  // Recalculate video size when participant count changes
  useEffect(() => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight
    });
  }, [currentParticipantCount]);

  return (
    <Box sx={{ position: "relative", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Fixed Leave Call Button */}
      <Fab
        color="error"
        aria-label="leave call"
        onClick={handleLeaveCall}
        sx={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 1000,
          boxShadow: "0 4px 20px rgba(244, 67, 54, 0.3)",
        }}
      >
        <CallEndIcon />
      </Fab>

      {/* Header */}
      <Box textAlign="center" mb={2} px={2}>
        <Typography variant="h6" color="white">
          Video Call - {currentParticipantCount} participant{currentParticipantCount !== 1 ? 's' : ''}
        </Typography>
        {remoteStreams.length === 0 && (
          <Typography variant="body2" color="#888" mt={1}>
            Waiting for others to join...
          </Typography>
        )}
        {isRoomFull && (
          <Typography variant="body2" color="#ff6b6b" mt={1}>
            Room is full (max {MAX_PARTICIPANTS} participants)
          </Typography>
        )}
      </Box>

      {/* Video Grid */}
      <Box
        sx={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: `repeat(${gridLayout.cols}, ${videoSize.width}px)`,
          gridTemplateRows: `repeat(${gridLayout.rows}, ${videoSize.height}px)`,
          gap: 2,
          justifyContent: "center",
          alignContent: "center",
          p: 2,
          maxHeight: "calc(100vh - 200px)",
          overflow: "auto",
          placeItems: "center",
          transition: "all 0.3s ease-in-out",
        }}
      >
        {/* Local Video */}
        <Box position="relative">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: videoSize.width,
              height: videoSize.height,
              borderRadius: 8,
              backgroundColor: "#000",
              objectFit: "cover",
              border: "2px solid #4CAF50",
              transition: "all 0.3s ease-in-out",
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
            }}
          >
            You
          </Typography>
        </Box>

        {/* Remote Videos */}
        {remoteStreams.map(({ socketId, stream }) => (
          <Box key={socketId} position="relative">
            <video
              autoPlay
              playsInline
              style={{
                width: videoSize.width,
                height: videoSize.height,
                borderRadius: 8,
                backgroundColor: "#000",
                objectFit: "cover",
                border: "2px solid #2196F3",
                transition: "all 0.3s ease-in-out",
              }}
              ref={videoEl => {
                if (videoEl && stream) {
                  if (videoEl.srcObject !== stream) {
                    videoEl.srcObject = stream;
                  }
                }
              }}
              onLoadedMetadata={() => console.log("📺 Video metadata loaded for", socketId)}
              onPlay={() => console.log("▶️ Video playing for", socketId)}
              onError={(e) => console.error("❌ Video error for", socketId, e)}
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
              }}
            >
              User {socketId.slice(-4)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
