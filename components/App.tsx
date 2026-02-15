import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './services/firebase';
import { UserProfile, UserRole } from './types';

// Pages
import PublicPage from './pages/PublicPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ClientsPage from './pages/ClientsPage';
import AgendaPage from './pages/AgendaPage';
import GalleryAdminPage from './pages/GalleryAdminPage';
import FinancialPage from './pages/FinancialPage';
import BudgetsPage from './pages/BudgetsPage';
import ContractsPage from './pages/ContractsPage';
import CollaboratorsPage from './pages/CollaboratorsPage';
import SettingsPage from './pages/SettingsPage';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';

const ProtectedRoute = ({ children, allowedRoles }: { children?: React.ReactNode, allowedRoles?: UserRole[] }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  console.log('🔄 ProtectedRoute renderizado. Menu mobile está:', isMobileMenuOpen ? 'ABERTO' : 'FECHADO');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
          if (userDoc.exists()) {
            setUser({ uid: fbUser.uid, ...userDoc.data() } as UserProfile);
          } else {
            setUser({ 
              uid: fbUser.uid, 
              email: fbUser.email!, 
              displayName: fbUser.displayName || 'Admin', 
              role: UserRole.ADMIN 
            });
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.warn("Auth check error:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // DEBUG: Monitorar mudanças no estado do menu
  useEffect(() => {
    console.log('═══════════════════════════════════');
    console.log('📱 ESTADO DO MENU MUDOU!');
    console.log('🔵 isMobileMenuOpen:', isMobileMenuOpen);
    console.log('═══════════════════════════════════');
  }, [isMobileMenuOpen]);

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-stone-950">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-600 border-t-transparent mb-4"></div>
        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-stone-500">Carregando Sistema</span>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" />;

  const handleMenuClick = () => {
    console.log('═══════════════════════════════════');
    console.log('🎯 handleMenuClick CHAMADO!');
    console.log('📊 Estado ANTES:', isMobileMenuOpen);
    setIsMobileMenuOpen(true);
    console.log('📊 setIsMobileMenuOpen(true) executado');
    console.log('═══════════════════════════════════');
  };

  const handleMenuClose = () => {
    console.log('═══════════════════════════════════');
    console.log('❌ handleMenuClose CHAMADO!');
    console.log('📊 Estado ANTES:', isMobileMenuOpen);
    setIsMobileMenuOpen(false);
    console.log('📊 setIsMobileMenuOpen(false) executado');
    console.log('═══════════════════════════════════');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-stone-950">
      <Sidebar 
        role={user.role} 
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={handleMenuClose}
      />
      <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <Header 
          user={user} 
          onMenuClick={handleMenuClick}
        />
        <main className="p-4 md:p-8 max-w-[1600px] mx-auto w-full">
          {children}
        </main>
      </div>
      
      {/* INDICADOR VISUAL DE DEBUG */}
      <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg font-bold z-[9999] md:hidden">
        Menu: {isMobileMenuOpen ? '✅ ABERTO' : '❌ FECHADO'}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<PublicPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/agenda" element={<ProtectedRoute><AgendaPage /></ProtectedRoute>} />
        <Route path="/clientes" element={<ProtectedRoute><ClientsPage /></ProtectedRoute>} />
        <Route path="/orcamentos" element={<ProtectedRoute><BudgetsPage /></ProtectedRoute>} />
        <Route path="/galeria" element={<ProtectedRoute><GalleryAdminPage /></ProtectedRoute>} />
        <Route path="/financeiro" element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]}><FinancialPage /></ProtectedRoute>} />
        <Route path="/contratos" element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]}><ContractsPage /></ProtectedRoute>} />
        <Route path="/colaboradores" element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]}><CollaboratorsPage /></ProtectedRoute>} />
        <Route path="/configuracoes" element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]}><SettingsPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
