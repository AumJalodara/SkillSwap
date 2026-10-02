import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationsDropdown from '../components/NotificationsDropdown';

export default function MainLayout() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="text-2xl font-bold text-indigo-600 tracking-tight">
                SkillSwap
              </Link>
              {isAuthenticated && (
                <nav className="hidden md:flex space-x-4">
                  <Link to="/dashboard" className="text-slate-600 hover:text-indigo-600 font-medium">Dashboard</Link>
                  <Link to="/discover" className="text-slate-600 hover:text-indigo-600 font-medium">Discover</Link>
                  <Link to="/skills" className="text-slate-600 hover:text-indigo-600 font-medium">My Skills</Link>
                  <Link to="/sessions" className="text-slate-600 hover:text-indigo-600 font-medium">Sessions</Link>
                  <Link to="/credits" className="text-slate-600 hover:text-indigo-600 font-medium">Credits</Link>
                </nav>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {!isAuthenticated ? (
                <>
                  <Link to="/login" className="text-slate-600 hover:text-indigo-600 font-medium">Login</Link>
                  <Link to="/register" className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-700 transition-colors shadow-sm">
                    Sign Up
                  </Link>
                </>
              ) : (
                <>
                  <NotificationsDropdown />
                  <Link to="/profile" className="text-slate-600 hover:text-indigo-600 font-medium">Profile</Link>
                  <button onClick={handleLogout} className="text-slate-600 hover:text-red-600 font-medium">
                    Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="bg-slate-50 border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500">
          &copy; {new Date().getFullYear()} SkillSwap. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
