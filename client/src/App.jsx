import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home.jsx";
import Host from "./pages/Host.jsx";
import Player from "./pages/Player.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/host" element={<Host />} />
      <Route path="/play" element={<Player />} />
    </Routes>
  );
}
