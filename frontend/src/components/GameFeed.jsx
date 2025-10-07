import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Button,
  CardActions,
  CardMedia,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import axios from "axios";
import { ROUTES } from "../api/routes";

export default function GameFeed() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedGame, setSelectedGame] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        if (!ROUTES || !ROUTES.GAMES_LIST) {
          // fallback mock data
          setGames([
            {
              external_id: "1",
              title: "Space Meow",
              description: "A cute cosmic cat shooter. Blast dog ships and collect tuna!",
              play_url: "/play/space-meow",
            },
            {
              external_id: "2",
              title: "Puzzle Paws",
              description: "A relaxing match-3 puzzle game featuring adorable kittens.",
              play_url: "",
            },
            {
              external_id: "3",
              title: "Catventure",
              description: "Explore a mystical world full of fish, naps, and challenges!",
              play_url: "/play/catventure",
            },
          ]);
        } else {
          const res = await axios.get(ROUTES.GAMES_LIST, {
            params: { limit: 50, offset: 0 },
          });
          setGames(res.data);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load games.");
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  const handlePlayGame = (game) => {
    if (game.play_url) {
      window.open(game.play_url, "_blank"); // opens the game in a new tab
    } else {
      console.log("Game not playable yet:", game.title);
    }
  };

  const handleSeeMore = (game) => {
    setSelectedGame(game);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedGame(null);
  };

  if (loading)
    return (
      <Box
        flex={1}
        display="flex"
        alignItems="center"
        justifyContent="center"
        height="100%"
      >
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
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: "#444",
          borderRadius: "4px",
        },
      }}
    >
      <Typography
        variant="h5"
        sx={{ color: "#e3e5e8", mb: 2, fontWeight: "bold" }}
      >
        Game Feed 🎮
      </Typography>

      <Box
        display="grid"
        gridTemplateColumns={{
          xs: "1fr",
          sm: "1fr 1fr",
          md: "1fr 1fr 1fr",
        }}
        gap={2}
      >
        {games.map((game) => (
          <Card
            key={game.external_id}
            sx={{
              background: "#1e1f22",
              color: "#e3e5e8",
              border: "1px solid #2b2d31",
              display: "flex",
              flexDirection: "column",
              height: 420,
              "&:hover": {
                backgroundColor: "#27292d",
                transition: "0.2s",
              },
            }}
          >
            {/* Game Image */}
            <CardMedia
              component="img"
              height="180"
              image={game.cover_url || "https://via.placeholder.com/300x180?text=No+Image"}
              alt={game.title}
              sx={{ objectFit: "cover" }}
            />

            {/* Content Area - Scrollable if needed */}
            <CardContent sx={{ flexGrow: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <Typography variant="h6" sx={{ fontWeight: "bold", mb: 1 }}>
                {game.title}
              </Typography>
              <Typography
                variant="body2"
                sx={{ 
                  color: "#bfc4c8", 
                  lineHeight: 1.5,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {game.description}
              </Typography>
              {game.description && game.description.length > 100 && (
                <Button
                  size="small"
                  onClick={() => handleSeeMore(game)}
                  sx={{
                    color: "#5865f2",
                    textTransform: "none",
                    mt: 0.5,
                    alignSelf: "flex-start",
                    p: 0,
                    minWidth: 0,
                    "&:hover": { bgcolor: "transparent", textDecoration: "underline" },
                  }}
                >
                  See More
                </Button>
              )}
            </CardContent>

            {/* Fixed Play Button at Bottom */}
            <CardActions
              sx={{
                justifyContent: "center",
                p: 2,
                pt: 0,
                mt: "auto",
              }}
            >
              {game.play_url ? (
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => handlePlayGame(game)}
                  sx={{
                    bgcolor: "white",
                    color: "#1e1f22",
                    textTransform: "none",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    "&:hover": { bgcolor: "#e0e0e0" },
                  }}
                >
                  Play Now 🎮
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  fullWidth
                  disabled
                  sx={{
                    textTransform: "none",
                    borderColor: "#444",
                    color: "#888",
                  }}
                >
                  Coming Soon 🚧
                </Button>
              )}
            </CardActions>
          </Card>
        ))}
      </Box>

      {/* Description Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#1e1f22",
            color: "#e3e5e8",
          }
        }}
      >
        {selectedGame && (
          <>
            <DialogTitle sx={{ fontWeight: "bold", borderBottom: "1px solid #2b2d31" }}>
              {selectedGame.title}
            </DialogTitle>
            <DialogContent sx={{ mt: 2 }}>
              {selectedGame.thumbnail_url || selectedGame.image_url ? (
                <Box mb={2}>
                  <img 
                    src={selectedGame.thumbnail_url || selectedGame.image_url} 
                    alt={selectedGame.title}
                    style={{ width: "100%", borderRadius: "8px" }}
                  />
                </Box>
              ) : null}
              <Typography variant="body1" sx={{ color: "#bfc4c8", lineHeight: 1.8 }}>
                {selectedGame.description}
              </Typography>
            </DialogContent>
            <DialogActions sx={{ p: 2, borderTop: "1px solid #2b2d31" }}>
              <Button onClick={handleCloseDialog} sx={{ color: "#888" }}>
                Close
              </Button>
              {selectedGame.play_url && (
                <Button
                  variant="contained"
                  onClick={() => {
                    handlePlayGame(selectedGame);
                    handleCloseDialog();
                  }}
                  sx={{
                    bgcolor: "white",
                    color: "#1e1f22",
                    textTransform: "none",
                    "&:hover": { bgcolor: "#e0e0e0" },
                  }}
                >
                  Play Now 🎮
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {error && (
        <Typography sx={{ color: "#ff8b8b", mt: 2 }}>{error}</Typography>
      )}
    </Box>
  );
}
