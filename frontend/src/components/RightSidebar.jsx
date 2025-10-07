import React, { useEffect, useState } from "react";
import { 
  Box, 
  Typography, 
  Avatar, 
  Button, 
  TextField, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  IconButton,
  Divider,
  CircularProgress,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import SearchIcon from "@mui/icons-material/Search";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import axios from "axios";
import { ROUTES, API_BASE_URL } from "../api/routes";

export default function RightSidebar() {
  const [user, setUser] = useState(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [editedUsername, setEditedUsername] = useState("");
  const [editedEmail, setEditedEmail] = useState("");
  const [editedBio, setEditedBio] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      setEditedUsername(parsed.username || "");
      setEditedEmail(parsed.email || "");
      setEditedBio(parsed.bio || "");
    }
  }, []);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchResults.length > 0 && !event.target.closest('.search-container')) {
        setSearchResults([]);
        setSearchQuery("");
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchResults]);

  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    const token = localStorage.getItem("token");
    try {
      const res = await axios.post(ROUTES.UPLOAD_PROFILE_PICTURE, formData, {
        headers: { 
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}`
        }
      });
      
      const updatedUser = { ...user, profile_picture: res.data.profile_picture };
      setUser(updatedUser);
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      alert("Profile picture updated!");
    } catch (err) {
      alert("Failed to upload profile picture");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const token = localStorage.getItem("token");
    try {
      const res = await axios.put(ROUTES.UPDATE_PROFILE, {
        username: editedUsername,
        email: editedEmail,
        bio: editedBio
      }, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      const updatedUser = res.data.user;
      setUser(updatedUser);
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      alert("Profile updated successfully!");
      setProfileDialogOpen(false);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await axios.get(ROUTES.GET_ALL_USERS(user.username));
      const filtered = res.data.filter(u => 
        u.username.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
    } catch (err) {
      console.error("Search failed:", err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddFriend = async (receiverUsername) => {
    try {
      await axios.post(ROUTES.SEND_FRIEND_REQUEST(receiverUsername, user.username));
      alert("Friend request sent!");
      handleSearch(searchQuery);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to send friend request");
    }
  };

  if (!user) {
    return (
      <Box
        flex="1"
        minWidth="250px"
        maxWidth="350px"
        bgcolor="#0f1113"
        p={3}
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100%"
        sx={{ borderLeft: "1px solid #202225" }}
      >
        <Typography sx={{ color: "#9aa0a6" }}>Not logged in</Typography>
      </Box>
    );
  }

  const profilePicUrl = user.profile_picture ? `${API_BASE_URL}${user.profile_picture}` : "";

  return (
    <>
      <Box
        flex="1"
        minWidth="235px"
        
        bgcolor="#0f1113"
        p={3}
        display="flex"
        flexDirection="column"
        height="100%"
        sx={{
          borderLeft: "1px solid #202225",
          transition: "width 0.3s ease",
        }}
      >
        {/* Search Bar */}
        <Box mb={3} position="relative" className="search-container">
          <TextField
            fullWidth
            size="small"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#9aa0a6" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              bgcolor: "#111214",
              "& .MuiOutlinedInput-root": {
                color: "white",
                "& fieldset": { borderColor: "#2b2d31" },
                "&:hover fieldset": { borderColor: "#404249" },
                "&.Mui-focused fieldset": { borderColor: "white" },
              },
            }}
          />
          {searching && (
            <Box position="absolute" top="100%" left={0} right={0} mt={1} display="flex" justifyContent="center">
              <CircularProgress size={20} />
            </Box>
          )}
          {searchResults.length > 0 && (
            <Box
              position="absolute"
              top="100%"
              left={0}
              right={0}
              mt={1}
              zIndex={1000}
              sx={{
                bgcolor: "#111214",
                borderRadius: 1,
                boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                border: "1px solid #2b2d31",
              }}
            >
              <List sx={{ maxHeight: 300, overflow: "auto", p: 0 }}>
                {searchResults.map((result) => (
                  <ListItem
                    key={result.username}
                    secondaryAction={
                      result.status === "none" && (
                        <IconButton 
                          edge="end" 
                          size="small" 
                          onClick={() => {
                            handleAddFriend(result.username);
                            setSearchResults([]);
                            setSearchQuery("");
                          }} 
                          sx={{ color: "white" }}
                        >
                          <PersonAddIcon />
                        </IconButton>
                      )
                    }
                    sx={{
                      "&:hover": { bgcolor: "#1e1f22" },
                      borderBottom: "1px solid #2b2d31",
                      "&:last-child": { borderBottom: "none" },
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar src={result.profile_picture ? `${API_BASE_URL}${result.profile_picture}` : ""}>
                        {result.username[0].toUpperCase()}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={result.username}
                      secondary={result.status === "friends" ? "Friends" : result.status === "pending_sent" ? "Pending" : ""}
                      primaryTypographyProps={{ color: "white" }}
                      secondaryTypographyProps={{ color: "#9aa0a6" }}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </Box>

        {/* Profile Info */}
        <Box display="flex" gap={2} alignItems="center" position="relative">
          <Box position="relative">
            <Avatar sx={{ width: 64, height: 64, bgcolor: "#2f3136" }} src={profilePicUrl}>
              {user.username?.[0]?.toUpperCase()}
            </Avatar>
            <IconButton
              component="label"
              sx={{ position: "absolute", bottom: -5, right: -5, bgcolor: "white", color: "#1e1f22", width: 28, height: 28, "&:hover": { bgcolor: "#e0e0e0" } }}
              disabled={uploading}
            >
              {uploading ? <CircularProgress size={16} /> : <PhotoCameraIcon sx={{ fontSize: 16 }} />}
              <input type="file" hidden accept="image/*" onChange={handleProfilePictureUpload} />
            </IconButton>
          </Box>
          <Box flex={1}>
            <Typography sx={{ color: "#e6e7e8", fontWeight: 700 }}>{user.username}</Typography>
            <Typography sx={{ color: "#9aa0a6", fontSize: 12 }}>@{user.username?.toLowerCase()}</Typography>
          </Box>
        </Box>

        {user.bio && (
          <Box bgcolor="#111214" p={2} borderRadius={2} mt={2}>
            <Typography sx={{ color: "#9aa0a6", fontSize: 12 }}>Bio</Typography>
            <Typography sx={{ color: "#e6e7e8", fontSize: 14 }}>{user.bio}</Typography>
          </Box>
        )}

        <Box bgcolor="#111214" p={2} borderRadius={2} mt={2}>
          <Typography sx={{ color: "#9aa0a6", fontSize: 12 }}>Email</Typography>
          <Typography sx={{ color: "#e6e7e8", fontSize: 14 }}>{user.email || "Not set"}</Typography>
        </Box>

        <Box flexGrow={1} />

        <Button 
          fullWidth 
          variant="contained" 
          onClick={() => setProfileDialogOpen(true)} 
          startIcon={<EditIcon />}
          sx={{
            bgcolor: "white",
            color: "#1e1f22",
            "&:hover": { bgcolor: "#e0e0e0" },
          }}
        >
          Edit Profile
        </Button>
      </Box>
    </>
  );
}
