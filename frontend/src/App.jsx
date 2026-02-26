import { Routes, Route, Link } from 'react-router-dom';
import './App.css';
import { ArtistList } from './pages/ArtistList';
import { ArtistForm } from './pages/ArtistForm';
import { ArtistDetail } from './pages/ArtistDetail';
import { ArtistAvailability } from './pages/ArtistAvailability';
import { Studio } from './pages/Studio';

function App() {
  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="logo">Post.Ink</Link>
        <nav>
          <Link to="/artists">Artists</Link>
          <Link to="/artists/new">Add Artist</Link>
          <Link to="/studio">Studio</Link>
        </nav>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<ArtistList />} />
          <Route path="/artists" element={<ArtistList />} />
          <Route path="/artists/new" element={<ArtistForm />} />
          <Route path="/artists/:id" element={<ArtistDetail />} />
          <Route path="/artists/:id/edit" element={<ArtistForm />} />
          <Route path="/artists/:id/availability" element={<ArtistAvailability />} />
          <Route path="/studio" element={<Studio />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
