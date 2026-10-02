import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Skills from './pages/Skills';
import Discover from './pages/Discover';
import Sessions from './pages/Sessions';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        
        <Route element={<ProtectedRoute />}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="skills" element={<Skills />} />
          <Route path="discover" element={<Discover />} />
          <Route path="sessions" element={<Sessions />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
