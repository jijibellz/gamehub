// VideoCallComponent.jsx
import { useEffect, useRef, useState } from "react";
import { Box, Button } from "@mui/material";
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
        socketRef.current.on("offer", async ({ from, offer }) => {
          console.log("📥 Received offer from", from);
          const pc = createPeerConnection(from, localStream);
          setPeerConnections(prev => ({ ...prev, [from]: pc }));

          await pc.setRemoteDescription(offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log("📤 Sending answer to", from);
          socketRef.current.emit("answer", { to: from, answer, from: socketRef.current.id });
        });

        // 5️⃣ handle incoming answer
        socketRef.current.on("answer", async ({ from, answer }) => {
          console.log("📥 Received answer from", from);
          const pc = peerConnections[from];
          if (pc) {
            await pc.setRemoteDescription(answer);
          } else {
            console.warn("⚠️ No peer connection found for", from);
          }
        });

        // 6️⃣ handle ICE candidates
        socketRef.current.on("ice-candidate", ({ from, candidate }) => {
          console.log("🧊 Received ICE candidate from", from);
          const pc = peerConnections[from];
          if (pc && candidate) {
            pc.addIceCandidate(candidate).catch(err => 
              console.error("Error adding ICE candidate:", err)
            );
          }
        });

        // 7️⃣ handle user leaving
        socketRef.current.on("user-left", ({ socketId }) => {
          console.log("User left:", socketId);
          const pc = peerConnections[socketId];
          if (pc) pc.close();
          setPeerConnections(prev => {
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
      console.log("📹 Received remote track from", socketId, event);
      if (!event.streams || event.streams.length === 0) {
        console.warn("No streams in track event");
        return;
      }
      
      const remoteStream = event.streams[0];
      setRemoteStreams(prev => {
        // check if stream already exists
        if (prev.find(s => s.socketId === socketId)) return prev;
        // Store as object with socketId and stream
        return [...prev, { socketId, stream: remoteStream }];
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
      <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          style={{
            width: 300,
            height: 300,
            borderRadius: 8,
            backgroundColor: "#000",
            objectFit: "cover",
          }}
        />
        {remoteStreams.map(({ socketId, stream }) => (
          <video
            key={socketId}
            autoPlay
            style={{
              width: 300,
              height: 300,
              borderRadius: 8,
              backgroundColor: "#000",
              objectFit: "cover",
            }}
            ref={videoEl => {
              if (videoEl) videoEl.srcObject = stream;
            }}
          />
        ))}
      </Box>
      <Button variant="contained" color="error" onClick={handleLeaveCall}>
        Leave Call
      </Button>
    </Box>
  );
}
