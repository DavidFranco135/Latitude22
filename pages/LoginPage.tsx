
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, AlertCircle, ArrowLeft } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserRole } from '../types';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admlatitude22@gmail.com');
  const [password, setPassword] = useState('654321');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Garante que o documento do usuário existe no Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Cria perfil inicial se não existir (necessário para a primeira configuração)
        await setDoc(userDocRef, {
          email: user.email,
          displayName: user.displayName || 'Administrador',
          role: UserRole.ADMIN,
          createdAt: new Date()
        });
      }

      navigate('/dashboard');
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Credenciais inválidas. Verifique seu e-mail e senha.');
      } else if (err.message?.includes('permission-denied')) {
        setError('Acesso negado no banco de dados. Verifique as regras do Firestore.');
      } else {
        setError('Erro ao acessar o sistema. Verifique a configuração do Firebase.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-stone-950 px-4 overflow-hidden">
      {/* Background with overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=40" 
          className="h-full w-full object-cover opacity-20 blur-sm scale-105" 
          alt="" 
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-stone-950 via-stone-950/80 to-transparent"></div>
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8 rounded-2xl bg-white/5 p-8 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] md:p-12">
        <Link to="/" className="inline-flex items-center text-xs font-bold uppercase tracking-widest text-stone-400 hover:text-white transition-colors mb-4">
          <ArrowLeft size={14} className="mr-2" /> Voltar ao Site
        </Link>
        
        <div className="text-center">
          <h2 className="font-serif text-3xl font-bold tracking-[0.2em] text-white">LATITUDE22</h2>
          <p className="mt-2 text-[10px] text-amber-500 uppercase tracking-[0.4em]">Painel de Gestão</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="flex items-center space-x-2 rounded-lg bg-red-900/20 p-3 text-sm text-red-400 border border-red-900/50">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 ml-1">Usuário / E-mail</label>
              <div className="relative mt-1.5">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-500">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border border-white/10 bg-white/5 py-3.5 pl-10 pr-3 text-sm text-white focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all placeholder:text-stone-600"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 ml-1">Senha de Acesso</label>
              <div className="relative mt-1.5">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-stone-500">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-lg border border-white/10 bg-white/5 py-3.5 pl-10 pr-3 text-sm text-white focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all placeholder:text-stone-600"
                  placeholder="••••••"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-amber-600 py-4 text-xs font-bold uppercase tracking-widest text-white shadow-xl shadow-amber-900/40 transition-all hover:bg-amber-500 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
          >
            {loading ? 'Validando...' : 'Acessar Sistema'}
          </button>
        </form>

        <p className="text-center text-[10px] text-stone-500 uppercase tracking-widest mt-12">
          &copy; {new Date().getFullYear()} Latitude22 / Produzido por NIKLAUS
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
