import { HashRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { GeneratorPage } from './pages/GeneratorPage';
import { SavedRoutesPage } from './pages/SavedRoutesPage';
import { ActivityPage } from './pages/ActivityPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <HashRouter>
      <div className="app">
        <Header />
        <Routes>
          <Route path="/" element={<GeneratorPage />} />
          <Route path="/saved" element={<SavedRoutesPage />} />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </div>
    </HashRouter>
  );
}
