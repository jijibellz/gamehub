import { useState, useRef } from "react";
import { Box, Button } from "@mui/material";
import RecordRTC from "recordrtc";
import axios from "axios";
import { ROUTES } from "../api/routes";

export default function VoiceRecorder({ serverName, channelName, sender }) {
  const [recorder, setRecorder] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioMessages, setAudioMessages] = useState([]);
  const audioRef = useRef(null);

  // 🎙️ Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create new recorder instance
      const newRecorder = new RecordRTC(stream, {
        type: "audio",
        mimeType: "audio/webm",
        recorderType: RecordRTC.MediaStreamRecorder,
      });

      newRecorder.startRecording();
      setRecorder(newRecorder);
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  };

  // 🛑 Stop recording and upload
  const stopRecording = async () => {
    if (!recorder) return;

    try {
      await new Promise((resolve) => {
        recorder.stopRecording(resolve); // wait until it fully stops
      });

      const blob = recorder.getBlob();

      // ✅ stop mic stream properly
      if (recorder.stream) {
        recorder.stream.getTracks().forEach((track) => track.stop());
      }

      // ✅ prepare file for upload
      const formData = new FormData();
      formData.append("audio", blob, `voiceMessage_${Date.now()}.webm`);
      formData.append("sender_username", sender);

      // ✅ send to backend
      const res = await axios.post(
        ROUTES.SERVER_VOICE_UPLOAD(serverName, channelName),
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      console.log("✅ Voice message uploaded:", res.data);

      // ✅ display locally
      const audioUrl = URL.createObjectURL(blob);
      setAudioMessages((prev) => [...prev, { url: audioUrl, sender }]);
    } catch (err) {
      console.error("❌ Error uploading voice message:", err);
    } finally {
      setIsRecording(false);
      setRecorder(null);
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      gap={2}
      sx={{ width: "100%" }}
    >
      <Button
        variant="contained"
        color={isRecording ? "error" : "primary"}
        onClick={isRecording ? stopRecording : startRecording}
      >
        {isRecording ? "Stop Recording" : "Start Recording"}
      </Button>

      <Box display="flex" flexDirection="column" gap={1} mt={2} width="100%">
        {audioMessages.map((msg, index) => (
          <Box key={index}>
            <audio controls src={msg.url} ref={audioRef} style={{ width: "100%" }} />
            <p style={{ fontSize: 12, textAlign: "center", color: "#ddd" }}>
              🎙️ {msg.sender}
            </p>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
