import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import FabrikaPlan from './pages/FabrikaPlan'
import Polivalans from './pages/Polivalans'
import Personel from './pages/Personel'
import Ayarlar from './pages/Ayarlar'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<FabrikaPlan />} />
            <Route path="polivalans" element={<Polivalans />} />
            <Route path="personel" element={<ProtectedRoute roles={['admin', 'ik_uretim']}><Personel /></ProtectedRoute>} />
            <Route path="ayarlar" element={<ProtectedRoute roles={['admin']}><Ayarlar /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
