import { Box, IconButton, Tooltip } from "@mui/material";
import { Chat, Groups, SportsEsports, Logout } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

export default function LeftSidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear authentication data from localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("currentUser");
    // Navigate back to auth page
    navigate("/");
  };

  return (
    <Box
  display="flex"
  flexDirection="column"
  alignItems="center"
  width="80px"
  bgcolor="#0f1113"
  height="100vh"
  sx={{
    borderRight: "1px solid #202225",
    p: 2,
    boxSizing: "border-box",
  }}
>

      {/* top profile/avatar icon - Gaming Kitty */}
      <Box mb={1}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <img 
            src="/gaming-cat-icon.png" 
            alt="Gaming Cat" 
            style={{ 
              width: "100%", 
              height: "100%", 
              objectFit: "contain" 
            }} 
          />
        </Box>
      </Box>

      {/* nav icons */}
      <Box display="flex" flexDirection="column" gap={1} mt={1}>
        <Tooltip title="Games" placement="right">
          <IconButton
            sx={{
              bgcolor: "#111214",
              width: 48,
              height: 48,
              borderRadius: 2,
            }}
            onClick={() => navigate("/feed")}
          >
            <SportsEsports sx={{ color: "#dcdde1" }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Direct Messages" placement="right">
          <IconButton
            sx={{
              bgcolor: "#111214",
              width: 48,
              height: 48,
              borderRadius: 2,
            }}
            onClick={() => navigate("/chat")}
          >
            <Chat sx={{ color: "#dcdde1" }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Servers" placement="right">
          <IconButton
            sx={{
              bgcolor: "#111214",
              width: 48,
              height: 48,
              borderRadius: 2,
            }}
            onClick={() => navigate("/server")}
          >
            <Groups sx={{ color: "#dcdde1" }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* spacer */}
      <Box flexGrow={1} />

      {/* bottom logout button */}
      <Box mb={1}>
        <Tooltip title="Logout" placement="right">
          <IconButton
            sx={{
              bgcolor: "#111214",
              width: 40,
              height: 40,
              borderRadius: 2,
              "&:hover": {
                bgcolor: "#dc3545",
              },
            }}
            onClick={handleLogout}
          >
            <Logout sx={{ color: "#dcdde1" }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
