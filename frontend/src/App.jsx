import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import MainFeed from "./pages/MainFeed";
import ServerPage from "./pages/ServerPage";
import ChannelPage from "./pages/ChannelPage";
import ChatPage from "./pages/ChatPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/feed" element={<MainFeed />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/server" element={<ServerPage />} />
        <Route path="/server/:serverName" element={<ChannelPage />} />
      </Routes>
    </Router>
  );
}

export default App;
