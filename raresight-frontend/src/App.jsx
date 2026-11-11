import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Analyse from './pages/Analyse.jsx';
import History from './pages/History.jsx';
import AddClass from './pages/AddClass.jsx';
import Settings from './pages/Settings.jsx';

const AppLayout = () => {
  return (
    <>
      <Navbar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </>
  );
};

const App = () => {
  return (
    <Routes>
      {/* Public Auth Routes (No Navbar) */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected App Routes (With Navbar) */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/analyse" replace />} />
        <Route
          path="/analyse"
          element={
            <ProtectedRoute>
              <Analyse />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          }
        />
        <Route
          path="/add-class"
          element={
            <ProtectedRoute>
              <AddClass />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        {/* Wildcard Fallback */}
        <Route path="*" element={<Navigate to="/analyse" replace />} />
      </Route>
    </Routes>
  );
};

export default App;
