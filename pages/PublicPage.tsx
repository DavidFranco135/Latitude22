
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, MessageCircle, MapPin, Phone, ChevronRight, Lock, Sparkles } from 'lucide-react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

const PublicPage: React.FC = () => {
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    heroImage: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=100',
    aboutImage: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80',
    venueTitle: 'LATITUDE22',
    venueSubtitle: 'Eventos & Festas'
  });

  useEffect(() => {
    // Busca Galeria com tratamento de erro (caso o DB não exista ou falte permissão)
    const unsubGallery = onSnapshot(collection(db, 'gallery'), 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (items.length > 0) setGalleryItems(items);
      },
      (error) => {
        console.warn("Firestore Gallery access error (Database not initialized or Permission Denied):", error.message);
        // Itens de fallback caso o Firestore esteja inacessível
        setGalleryItems([
          { id: '1', url: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80', title: 'Salão Principal' },
          { id: '2', url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80', title: 'Decoração de Mesa' },
          { id: '3', url: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&q=80', title: 'Iluminação Cênica' },
        ]);
      }
    );

    // Busca Configurações com tratamento de erro
    const unsubSettings = onSnapshot(doc(db, 'settings', 'general'), 
      (docSnap) => {
        if (docSnap.exists()) {
          setSettings(prev => ({ ...prev, ...docSnap.data() }));
        }
      },
      (error) => {
        console.warn("Firestore Settings access error (Database not initialized or Permission Denied):", error.message);
      }
    );

    return () => {
      unsubGallery();
      unsubSettings();
    };
  }, []);

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 selection:bg-amber-600 selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-stone-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between p-4 md:px-8">
          <Link to="/" className="flex flex-col items-center group">
            <span className="font-serif text-2xl font-bold tracking-[0.4em] text-white group-hover:text-amber-500 transition-colors uppercase">{settings.venueTitle}</span>
            <span className="text-[9px] uppercase tracking-[0.6em] text-amber-600 font-bold -mt-1">{settings.venueSubtitle}</span>
          </Link>
          
          <div className="hidden space-x-12 text-[10px] font-bold uppercase tracking-[0.3em] md:flex">
            <a href="#galeria" className="hover:text-amber-500 transition-colors">Galeria</a>
            <a href="#contato" className="hover:text-amber-500 transition-colors">Contato</a>
            <Link to="/login" className="flex items-center space-x-2 text-stone-500 hover:text-white transition-colors">
              <Lock size={12} />
              <span>Gestor</span>
            </Link>
          </div>
          
          <a href={`https://wa.me/${settings.whatsapp || '5500000000000'}`} target="_blank" className="rounded-sm bg-amber-600 px-8 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-500 transition-all shadow-xl shadow-amber-900/20">
            Reservar Data
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex h-screen items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={settings.heroImage} className="h-full w-full object-cover opacity-60 scale-105" alt="Hero" />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/40 via-stone-950/60 to-stone-950"></div>
        </div>
        <div className="relative z-10 text-center px-4 max-w-4xl">
          <div className="inline-flex items-center space-x-2 mb-8 bg-amber-600/20 px-4 py-2 rounded-full border border-amber-600/30 backdrop-blur-md">
            <Sparkles size={14} className="text-amber-500" />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-amber-100">Exclusividade & Requinte</span>
          </div>
          <h2 className="mb-8 font-serif text-5xl md:text-8xl text-white leading-tight drop-shadow-2xl">Onde os sonhos se tornam memórias</h2>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
            <a href="#galeria" className="w-full sm:w-auto px-12 py-5 bg-white text-stone-950 text-[10px] font-bold uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all">Ver Portfólio</a>
            <a href="#contato" className="w-full sm:w-auto px-12 py-5 border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all">Solicitar Orçamento</a>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="galeria" className="py-32 px-4 bg-stone-950">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-20">
            <span className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.5em]">Experiências Reais</span>
            <h3 className="mt-4 font-serif text-4xl md:text-6xl text-white">Inspirações Latitude22</h3>
            <div className="mt-6 h-px w-24 bg-amber-600/50 mx-auto"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {galleryItems.map((item, i) => (
              <div key={item.id || i} className="group relative aspect-[4/5] overflow-hidden rounded-sm bg-stone-900 border border-white/5">
                <img src={item.url} alt={item.title} className="h-full w-full object-cover opacity-80 transition-transform duration-1000 group-hover:scale-110 group-hover:opacity-100" />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent opacity-80"></div>
                <div className="absolute bottom-8 left-8">
                  <span className="text-white text-xs font-bold uppercase tracking-[0.3em] block mb-2">{item.title}</span>
                  <div className="h-px w-8 bg-amber-500 transition-all group-hover:w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contato" className="border-t border-white/5 py-24 bg-stone-900">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid grid-cols-1 gap-20 md:grid-cols-4">
            <div className="col-span-1">
              <span className="font-serif text-2xl font-bold tracking-[0.4em] text-white uppercase">{settings.venueTitle}</span>
              <p className="text-stone-500 text-sm mt-6 leading-relaxed">Cenas inesquecíveis, serviços impecáveis e a exclusividade que seu evento merece.</p>
              <div className="mt-8 flex space-x-4">
                <a href="#" className="p-3 bg-stone-950 rounded-full text-amber-600 hover:bg-amber-600 hover:text-white transition-all"><Instagram size={20} /></a>
                <a href="#" className="p-3 bg-stone-950 rounded-full text-amber-600 hover:bg-amber-600 hover:text-white transition-all"><MessageCircle size={20} /></a>
              </div>
            </div>
            <div className="space-y-8">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">Links Rápidos</h4>
              <ul className="space-y-4 text-stone-500 text-xs font-medium uppercase tracking-widest">
                <li><a href="#" className="hover:text-amber-500 transition-colors">O Espaço</a></li>
                <li><a href="#galeria" className="hover:text-amber-500 transition-colors">Portfólio</a></li>
                <li><a href="#" className="hover:text-amber-500 transition-colors">Buffet & Menu</a></li>
              </ul>
            </div>
            <div className="space-y-8">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">Onde Estamos</h4>
              <div className="space-y-4 text-stone-500 text-sm">
                <div className="flex items-start space-x-4">
                  <MapPin size={20} className="text-amber-600 shrink-0" />
                  <p className="leading-relaxed">{settings.address || 'Al. das Palmeiras, 222 - Jardins, São Paulo'}</p>
                </div>
              </div>
            </div>
            <div className="space-y-8">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">Área do Gestor</h4>
              <Link to="/login" className="inline-flex items-center space-x-3 rounded-sm bg-stone-950 border border-white/5 px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:bg-amber-600 hover:text-white hover:border-amber-600 transition-all shadow-2xl">
                <Lock size={14} />
                <span>Entrar no Painel</span>
              </Link>
            </div>
          </div>
          <div className="mt-24 pt-8 border-t border-white/5 text-center text-[9px] font-bold uppercase tracking-[0.4em] text-stone-600">
            &copy; {new Date().getFullYear()} Salão Latitude22 | Crafted for Excellence
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicPage;
