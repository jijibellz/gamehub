// VideoCallComponent.jsx
import { useEffect, useRef, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { io } from "socket.io-client";
import { SOCKET_SERVER_URL } from "../api/routes";

export default function VideoCallComponent({ serverName, channelName, currentUser, onLeaveCall }) {
  const localVideoRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState([]); // array of {socketId, stream}
  const [peerConnections, setPeerConnections] = useState({}); // {socketId: RTCPeerConnection}
  const [stream, setStream] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    let localStream;
    

    const initCall = async () => {
      try {
        // Check if currentUser exists
        if (!currentUser?.username) {
          console.error("Cannot join video call: currentUser is undefined");
          return;
        }

        // 1️⃣ get local stream
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(localStream);
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

        // 2️⃣ connect to signaling server
        socketRef.current = io(SOCKET_SERVER_URL);

        socketRef.current.emit("join-room", {
          roomId: channelName,
          userId: currentUser.username,
        });

        // 3️⃣ listen for other users joining
        socketRef.current.on("user-joined", ({ userId, socketId }) => {
          console.log("🆕 New user joined:", userId, "socketId:", socketId);

          // Don't connect to yourself
          if (socketId === socketRef.current.id) {
            console.log("⚠️ Ignoring self-connection");
            return;
          }

          // Check if we already have a connection with this user
          if (peerConnections[socketId]) {
            console.log("⚠️ Already have connection with", socketId);
            return;
          }

          const pc = createPeerConnection(socketId, localStream);
          setPeerConnections(prev => ({ ...prev, [socketId]: pc }));

          // create and send offer
          pc.createOffer()
            .then(offer => {
              pc.setLocalDescription(offer);
              console.log("📤 Sending offer to", socketId);
              socketRef.current.emit("offer", { to: socketId, offer, from: socketRef.current.id });
            })
            .catch(err => console.error("Error creating offer:", err));
        });

        // 4️⃣ handle incoming offer
       // 4️⃣ handle incoming offer
socketRef.current.on("offer", async ({ from, offer }) => {
  console.log("📥 Received offer from", from);

  // Check if we already have a connection with this user
  if (peerConnections[from]) {
    console.log("⚠️ Already have connection with", from, "- ignoring duplicate offer");
    return;
  }

  const pc = createPeerConnection(from, localStream);
  setPeerConnections(prev => ({ ...prev, [from]: pc }));

  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  // ✨ SEND ANSWER BACK TO OFFERER ✨
  socketRef.current.emit("answer", {
    to: from,
    answer,
    from: socketRef.current.id,
  });

  console.log("📤 Sending answer to", from);
});

        // 5️⃣ handle incoming answer
        socketRef.current.on("answer", async ({ from, answer }) => {
          console.log("📥 Received answer from", from);
          setPeerConnections(prev => {
            const pc = prev[from];
            if (pc) {
              pc.setRemoteDescription(answer).catch(err =>
                console.error("Error setting remote description:", err)
              );
            } else {
              console.warn("⚠️ No peer connection found for", from);
            }
            return prev;
          });
        });

        // 6️⃣ handle ICE candidates
        socketRef.current.on("ice-candidate", ({ from, candidate }) => {
          console.log("🧊 Received ICE candidate from", from);
          setPeerConnections(prev => {
            const pc = prev[from];
            if (pc && candidate) {
              pc.addIceCandidate(candidate).catch(err =>
                console.error("Error adding ICE candidate:", err)
              );
            }
            return prev;
          });
        });

        // 7️⃣ handle user leaving
        socketRef.current.on("user-left", ({ socketId }) => {
          console.log("User left:", socketId);
          setPeerConnections(prev => {
            const pc = prev[socketId];
            if (pc) pc.close();
            const newPeers = { ...prev };
            delete newPeers[socketId];
            return newPeers;
          });
          setRemoteStreams(prev => prev.filter(s => s.socketId !== socketId));
        });
      } catch (err) {
        console.error("Error accessing media devices.", err);
      }
    };

    initCall();

    return () => {
      // cleanup on leave/unmount
      if (socketRef.current) socketRef.current.disconnect();
      if (stream) stream.getTracks().forEach(track => track.stop());
      Object.values(peerConnections).forEach(pc => pc.close());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createPeerConnection = (socketId, localStream) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        // Multiple TURN servers for redundancy
        {
          urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject',
          credential: 'openrelayproject',
        },
        {
          urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject',
          credential: 'openrelayproject',
        },
        {
          urls: 'turn:openrelay.metered.ca:443?transport=tcp',
          username: 'openrelayproject',
          credential: 'openrelayproject',
        },
      ],
      iceCandidatePoolSize: 10,
    });

    // Add local tracks
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    // Handle remote track
    pc.ontrack = event => {
      console.log("📹 Received remote track from", socketId, "tracks:", event.streams?.length || 0);
      if (!event.streams || event.streams.length === 0) {
        console.warn("⚠️ No streams in track event for", socketId);
        return;
      }

      const remoteStream = event.streams[0];
      console.log("🎥 Remote stream tracks:", remoteStream.getTracks().length);

      setRemoteStreams(prev => {
        // Check if we already have a stream from this user
        const existingIndex = prev.findIndex(s => s.socketId === socketId);
        if (existingIndex >= 0) {
          console.log("🔄 Updating existing remote stream for", socketId);
          const updated = [...prev];
          updated[existingIndex] = { socketId, stream: remoteStream };
          return updated;
        } else {
          console.log("➕ Adding new remote stream for", socketId);
          return [...prev, { socketId, stream: remoteStream }];
        }
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = event => {
      if (event.candidate) {
        socketRef.current.emit("ice-candidate", {
          to: socketId,
          candidate: event.candidate,
          from: socketRef.current.id,
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`🔗 Connection state with ${socketId}:`, pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.warn(`Connection ${pc.connectionState} with ${socketId}`);
      }
    };

    // Handle ICE connection state
    pc.oniceconnectionstatechange = () => {
      console.log(`🧊 ICE state with ${socketId}:`, pc.iceConnectionState);
    };

    return pc;
  };

  const handleLeaveCall = () => {
    // stop local stream
    if (stream) stream.getTracks().forEach(track => track.stop());

    // close all peer connections
    Object.values(peerConnections).forEach(pc => pc.close());

    // disconnect from signaling server
    if (socketRef.current) socketRef.current.disconnect();

    // call parent callback to restore join button
    if (onLeaveCall) onLeaveCall();
  };

  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" gap={2}>
      {/* Call status */}
      <Box textAlign="center" mb={2}>
        <Typography variant="h6" color="white">
          Video Call - {remoteStreams.length + 1} participant{remoteStreams.length !== 0 ? 's' : ''}
        </Typography>
        {remoteStreams.length === 0 && (
          <Typography variant="body2" color="#888" mt={1}>
            Waiting for others to join...
          </Typography>
        )}
      </Box>

      <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
        {/* Local video */}
        <Box position="relative">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: 300,
              height: 300,
              borderRadius: 8,
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
            }}
          >
            You
          </Typography>
        </Box>

        {/* Remote videos */}
        {remoteStreams.map(({ socketId, stream }) => (
          <Box key={socketId} position="relative">
            <video
              autoPlay
              playsInline
              style={{
                width: 300,
                height: 300,
                borderRadius: 8,
                backgroundColor: "#000",
                objectFit: "cover",
                border: "2px solid #2196F3",
              }}
              ref={videoEl => {
                if (videoEl && stream) {
                  console.log("🎬 Setting srcObject for", socketId, "stream tracks:", stream.getTracks().length);
                  videoEl.srcObject = stream;
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
      <Button variant="contained" color="error" onClick={handleLeaveCall}>
        Leave Call
      </Button>
    </Box>
  );
}
