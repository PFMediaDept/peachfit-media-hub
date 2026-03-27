import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Branch, { BranchOverview, BranchSOPs, BranchOnboarding } from './pages/Branch'
import PipelineBoard from './pages/PipelineBoard'
import ContentCalendar from './pages/ContentCalendar'
import MyTasks from "./pages/MyTasks"
import AdminUsers from './pages/AdminUsers'
import AdminSOPs from './pages/AdminSOPs'
import AdminAnnouncements from './pages/AdminAnnouncements'
import AdminOnboarding from './pages/AdminOnboarding'
import AdminSettings from './pages/AdminSettings'
import { TeamDirectory, DeptStandards, BrandAssets, QuickLinks } from './pages/GeneralPages'
import './styles/global.css'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/team" element={<TeamDirectory />} />
            <Route path="/standards" element={<DeptStandards />} />
            <Route path="/assets" element={<BrandAssets />} />
            <Route path="/links" element={<QuickLinks />} />
              <Route path="/my-tasks" element={<ProtectedRoute><MyTasks /></ProtectedRoute>} />
            <Route path="/calendar" element={<ContentCalendar />} />

            <Route path="/branch/:slug" element={<Branch />}>
              <Route index element={<BranchOverview />} />
              <Route path="pipeline" element={<PipelineBoard />} />
              <Route path="sops" element={<BranchSOPs />} />
              <Route path="onboarding" element={<BranchOnboarding />} />
            </Route>

            <Route path="/admin/users" element={
              <ProtectedRoute adminOnly>
                <AdminUsers />
              </ProtectedRoute>
            } />
            <Route path="/admin/sops" element={
              <ProtectedRoute adminOnly>
                <AdminSOPs />
              </ProtectedRoute>
            } />
            <Route path="/admin/announcements" element={
              <ProtectedRoute adminOnly>
                <AdminAnnouncements />
              </ProtectedRoute>
            } />
            <Route path="/admin/onboarding" element={
              <ProtectedRoute adminOnly>
                <AdminOnboarding />
              </ProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <ProtectedRoute adminOnly>
                <AdminSettings />
              </ProtectedRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
