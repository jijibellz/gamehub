import React from "react";
import { Box } from "@mui/material";
import LeftSidebar from "../components/LeftSidebar";
import RightSidebar from "../components/RightSidebar";
import GameFeed from "../components/GameFeed";

export default function MainFeed() {
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
    margin: 0,
    padding: 0,
    overflow: "hidden", // keeps it snug
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
          height: "100%", // fill vertical space
        }}
      >
        <LeftSidebar style={{ flex: 1, width: "100%" }} />
      </Box>

      {/* MAIN FEED */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          bgcolor: "#313338",
          p: 2,
          height: "100%",
          "&::-webkit-scrollbar": {
            width: "8px",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#555",
            borderRadius: "4px",
          },
        }}
      >
        <GameFeed />
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
          height: "100%", // fill vertical space
        }}
      >
        <RightSidebar style={{ flex: 1, width: "100%" }} />
      </Box>
    </Box>
  );
}
