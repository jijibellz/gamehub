import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormGroup,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ROUTES } from "../api/routes";

export default function ServerFeed() {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [newServerName, setNewServerName] = useState("");
  const [newServerDesc, setNewServerDesc] = useState("");
  const [channelTypes, setChannelTypes] = useState({
    text: true,
    voice: false,
    video: false,
  });

  const navigate = useNavigate();

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const res = await axios.get(ROUTES.SERVERS_LIST);
        setServers(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load servers.");
      } finally {
        setLoading(false);
      }
    };
    fetchServers();
  }, []);

  const handleEnterServer = (server) => {
    navigate(`/server/${server.name}`);
  };

  const handleCreateServer = async () => {
    try {
      const res = await axios.post(ROUTES.SERVERS_LIST, {
        name: newServerName,
        description: newServerDesc,
      });

      // Create default channels for all selected types
      for (const type of Object.keys(channelTypes)) {
        if (channelTypes[type]) {
          await axios.post(`${ROUTES.SERVERS_LIST}${newServerName}/channels`, {
            name: type === "text" ? "general" : type,
            type,
          });
        }
      }

      setServers((prev) => [...prev, res.data]);
      setCreateOpen(false);
      setNewServerName("");
      setNewServerDesc("");
      setChannelTypes({ text: true, voice: false, video: false });
    } catch (err) {
      console.error("Failed to create server:", err);
      setError("Failed to create server.");
    }
  };

  const handleCheckboxChange = (type) => {
    setChannelTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  if (loading)
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress />
      </Box>
    );

  return (
    <Box
      flex={1}
      bgcolor="#111215"
      p={3}
      overflow="auto"
      sx={{
        "&::-webkit-scrollbar": { width: "8px" },
        "&::-webkit-scrollbar-thumb": { backgroundColor: "#444", borderRadius: "4px" },
      }}
    >
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" sx={{ color: "#e3e5e8", fontWeight: "bold" }}>
          Server Feed 🏠
        </Typography>
        <Button
          variant="contained"
          sx={{
            backgroundColor: "#fff",
            color: "#000",
            textTransform: "none",
            fontWeight: "bold",
            "&:hover": {
              backgroundColor: "#ddd",
            },
          }}
          onClick={() => setCreateOpen(true)}
        >
          + Create Server
        </Button>
      </Box>

      {/* Server Cards */}
      <Box display="grid" gridTemplateColumns={{ xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }} gap={2}>
        {servers.map((server) => (
          <Card
            key={server.name}
            sx={{
              background: "#1e1f22",
              color: "#e3e5e8",
              border: "1px solid #2b2d31",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 150,
              "&:hover": { backgroundColor: "#27292d", transition: "0.2s" },
            }}
          >
            <CardContent sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                {server.name}
              </Typography>
              <Typography variant="body2" sx={{ color: "#bfc4c8", mt: 1, lineHeight: 1.5 }}>
                {server.description}
              </Typography>
              <Typography variant="caption" sx={{ color: "#888", mt: 1 }}>
                {server.members?.length || 0} members
              </Typography>
            </CardContent>

            <Box p={2} pt={0} display="flex" justifyContent="flex-end">
              <Button
                variant="contained"
                sx={{
                  backgroundColor: "#fff",
                  color: "#000",
                  textTransform: "none",
                  fontWeight: "bold",
                  "&:hover": {
                    backgroundColor: "#ddd",
                  },
                }}
                onClick={() => handleEnterServer(server)}
              >
                Enter
              </Button>
            </Box>
          </Card>
        ))}
      </Box>

      {error && <Typography sx={{ color: "#ff8b8b", mt: 2 }}>{error}</Typography>}

      {/* Create Server Dialog */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
        <DialogTitle>Create a Server</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 300 }}>
          <TextField
            label="Server Name"
            value={newServerName}
            onChange={(e) => setNewServerName(e.target.value)}
            fullWidth
          />
          <TextField
            label="Description"
            value={newServerDesc}
            onChange={(e) => setNewServerDesc(e.target.value)}
            fullWidth
          />
          <Typography variant="subtitle2" sx={{ mt: 1 }}>
            Select Channel Types:
          </Typography>
          <FormGroup>
            {["text", "voice", "video"].map((type) => (
              <FormControlLabel
                key={type}
                control={
                  <Checkbox
                    checked={channelTypes[type]}
                    onChange={() => handleCheckboxChange(type)}
                  />
                }
                label={type.charAt(0).toUpperCase() + type.slice(1)}
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            sx={{
              backgroundColor: "#fff",
              color: "#000",
              fontWeight: "bold",
              "&:hover": {
                backgroundColor: "#ddd",
              },
            }}
            onClick={handleCreateServer}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
