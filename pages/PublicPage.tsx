import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, MessageCircle, MapPin, Phone, ChevronRight, Lock, Sparkles, Mail, Calendar } from 'lucide-react';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

const PublicPage: React.FC = () => {
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({
    coverImage: '', // NOVA CAPA
    heroImage: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=100',
    aboutImage: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80',
    venueTitle: 'LATITUDE22',
    venueSubtitle: 'Eventos & Festas',
    whatsapp: '',
    instagram: '',
    address: '',
    email: ''
  });

  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    name: '',
    email: '',
    phone: '',
    eventType: '',
    eventDate: '',
    guestCount: '',
    message: ''
  });

  useEffect(() => {
    // Busca Galeria
    const unsubGallery = onSnapshot(
      collection(db, 'gallery'), 
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (items.length > 0) setGalleryItems(items);
      },
      (error) => {
        console.warn("Firestore Gallery error:", error.message);
        // Fallback items
        setGalleryItems([
          { id: '1', url: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=80', title: 'Salão Principal' },
          { id: '2', url: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80', title: 'Decoração de Mesa' },
          { id: '3', url: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&q=80', title: 'Iluminação Cênica' },
        ]);
      }
    );

    // Busca Configurações
    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'general'), 
      (docSnap) => {
        if (docSnap.exists()) {
          setSettings(prev => ({ ...prev, ...docSnap.data() }));
        }
      },
      (error) => {
        console.warn("Firestore Settings error:", error.message);
      }
    );

    return () => {
      unsubGallery();
      unsubSettings();
    };
  }, []);

  // Função para abrir WhatsApp
  const openWhatsApp = () => {
    const phone = settings.whatsapp || '5500000000000';
    const message = encodeURIComponent('Olá! Gostaria de saber mais sobre o espaço e disponibilidade de datas.');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  // Função para abrir Instagram
  const openInstagram = () => {
    const instagram = settings.instagram || 'latitude22_';
    const username = instagram.replace('@', '');
    window.open(`https://instagram.com/${username}`, '_blank');
  };

  // Função para enviar email
  const openEmail = () => {
    const email = settings.email || 'contato@latitude22.com';
    const subject = encodeURIComponent('Solicitação de Orçamento');
    const body = encodeURIComponent('Olá! Gostaria de solicitar um orçamento para meu evento.');
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  // Função para abrir mapa
  const openMap = () => {
    const address = settings.address || 'Latitude22 Eventos';
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  // Scroll suave
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 selection:bg-amber-600 selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-stone-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between p-4 md:px-8">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex flex-col items-center group">
            <span className="font-serif text-2xl font-bold tracking-[0.4em] text-white group-hover:text-amber-500 transition-colors uppercase">
              {settings.venueTitle}
            </span>
            <span className="text-[9px] uppercase tracking-[0.6em] text-amber-600 font-bold -mt-1">
              {settings.venueSubtitle}
            </span>
          </button>
          
          <div className="hidden space-x-12 text-[10px] font-bold uppercase tracking-[0.3em] md:flex">
            <button onClick={() => scrollToSection('galeria')} className="hover:text-amber-500 transition-colors">
              Galeria
            </button>
            <button onClick={() => scrollToSection('contato')} className="hover:text-amber-500 transition-colors">
              Contato
            </button>
            <Link to="/login" className="flex items-center space-x-2 text-stone-500 hover:text-white transition-colors">
              <Lock size={12} />
              <span>Gestor</span>
            </Link>
          </div>
          
          <button 
            onClick={openWhatsApp}
            className="rounded-sm bg-amber-600 px-8 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-500 transition-all shadow-xl shadow-amber-900/20"
          >
            Reservar Data
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex h-screen items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={settings.coverImage || settings.heroImage} 
            className="h-full w-full object-cover opacity-60 scale-105" 
            alt="Hero" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/40 via-stone-950/60 to-stone-950"></div>
        </div>
        <div className="relative z-10 text-center px-4 max-w-4xl">
          <div className="inline-flex items-center space-x-2 mb-8 bg-amber-600/20 px-4 py-2 rounded-full border border-amber-600/30 backdrop-blur-md">
            <Sparkles size={14} className="text-amber-500" />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-amber-100">
              Exclusividade & Requinte
            </span>
          </div>
          <h2 className="mb-8 font-serif text-5xl md:text-8xl text-white leading-tight drop-shadow-2xl">
            Onde os sonhos se tornam memórias
          </h2>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
            <button 
              onClick={() => scrollToSection('galeria')}
              className="w-full sm:w-auto px-12 py-5 bg-white text-stone-950 text-[10px] font-bold uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all"
            >
              Ver Portfólio
            </button>
            <button 
              onClick={() => setShowBudgetModal(true)}
              className="w-full sm:w-auto px-12 py-5 border border-white/20 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              Solicitar Orçamento
            </button>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="galeria" className="py-32 px-4 bg-stone-950">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-20">
            <span className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.5em]">
              Experiências Reais
            </span>
            <h3 className="mt-4 font-serif text-4xl md:text-6xl text-white">
              Inspirações Latitude22
            </h3>
            <div className="mt-6 h-px w-24 bg-amber-600/50 mx-auto"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {galleryItems.map((item, i) => (
              <div 
                key={item.id || i} 
                className="group relative aspect-[4/5] overflow-hidden rounded-sm bg-stone-900 border border-white/5"
              >
                <img 
                  src={item.url} 
                  alt={item.title} 
                  className="h-full w-full object-cover opacity-80 transition-transform duration-1000 group-hover:scale-110 group-hover:opacity-100" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent opacity-80"></div>
                <div className="absolute bottom-8 left-8">
                  <span className="text-white text-xs font-bold uppercase tracking-[0.3em] block mb-2">
                    {item.title}
                  </span>
                  <div className="h-px w-8 bg-amber-500 transition-all group-hover:w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-32 px-4 bg-stone-900">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="relative aspect-[4/5] overflow-hidden rounded-sm">
              <img 
                src={settings.aboutImage} 
                alt="Sobre" 
                className="h-full w-full object-cover" 
              />
            </div>
            <div className="space-y-8">
              <span className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.5em]">
                Sobre Nós
              </span>
              <h3 className="font-serif text-4xl md:text-5xl text-white leading-tight">
                Um espaço pensado para celebrar seus momentos
              </h3>
              <p className="text-stone-400 text-lg leading-relaxed">
                Com infraestrutura completa, design sofisticado e equipe especializada, 
                transformamos cada evento em uma experiência única e memorável.
              </p>
              <div className="grid grid-cols-2 gap-8 pt-8">
                <div>
                  <p className="text-4xl font-bold text-amber-500">500+</p>
                  <p className="text-sm text-stone-500 uppercase tracking-widest mt-2">Eventos Realizados</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-amber-500">10+</p>
                  <p className="text-sm text-stone-500 uppercase tracking-widest mt-2">Anos de Experiência</p>
                </div>
              </div>
              <button 
                onClick={openWhatsApp}
                className="inline-flex items-center space-x-3 px-10 py-4 bg-amber-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-amber-500 transition-all"
              >
                <MessageCircle size={16} />
                <span>Fale Conosco</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contato" className="border-t border-white/5 py-24 bg-stone-900">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid grid-cols-1 gap-20 md:grid-cols-4">
            <div className="col-span-1">
              <span className="font-serif text-2xl font-bold tracking-[0.4em] text-white uppercase">
                {settings.venueTitle}
              </span>
              <p className="text-stone-500 text-sm mt-6 leading-relaxed">
                Cenas inesquecíveis, serviços impecáveis e a exclusividade que seu evento merece.
              </p>
              <div className="mt-8 flex space-x-4">
                <button 
                  onClick={openInstagram}
                  className="p-3 bg-stone-950 rounded-full text-amber-600 hover:bg-amber-600 hover:text-white transition-all"
                  title="Instagram"
                >
                  <Instagram size={20} />
                </button>
                <button 
                  onClick={openWhatsApp}
                  className="p-3 bg-stone-950 rounded-full text-amber-600 hover:bg-amber-600 hover:text-white transition-all"
                  title="WhatsApp"
                >
                  <MessageCircle size={20} />
                </button>
                <button 
                  onClick={openEmail}
                  className="p-3 bg-stone-950 rounded-full text-amber-600 hover:bg-amber-600 hover:text-white transition-all"
                  title="Email"
                >
                  <Mail size={20} />
                </button>
              </div>
            </div>
            
            <div className="space-y-8">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">Links Rápidos</h4>
              <ul className="space-y-4 text-stone-500 text-xs font-medium uppercase tracking-widest">
                <li>
                  <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-amber-500 transition-colors">
                    O Espaço
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('galeria')} className="hover:text-amber-500 transition-colors">
                    Portfólio
                  </button>
                </li>
                <li>
                  <button onClick={() => setShowBudgetModal(true)} className="hover:text-amber-500 transition-colors">
                    Solicitar Orçamento
                  </button>
                </li>
              </ul>
            </div>
            
            <div className="space-y-8">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">Onde Estamos</h4>
              <div className="space-y-4 text-stone-500 text-sm">
                <button 
                  onClick={openMap}
                  className="flex items-start space-x-4 hover:text-amber-500 transition-colors text-left"
                >
                  <MapPin size={20} className="text-amber-600 shrink-0" />
                  <p className="leading-relaxed">
                    {settings.address || 'Al. das Palmeiras, 222 - Jardins, São Paulo'}
                  </p>
                </button>
                
                {settings.whatsapp && (
                  <button 
                    onClick={openWhatsApp}
                    className="flex items-start space-x-4 hover:text-amber-500 transition-colors"
                  >
                    <Phone size={20} className="text-amber-600 shrink-0" />
                    <p className="leading-relaxed">{settings.whatsapp}</p>
                  </button>
                )}
              </div>
            </div>
            
            <div className="space-y-8">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">Área do Gestor</h4>
              <Link 
                to="/login" 
                className="inline-flex items-center space-x-3 rounded-sm bg-stone-950 border border-white/5 px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:bg-amber-600 hover:text-white hover:border-amber-600 transition-all shadow-2xl"
              >
                <Lock size={14} />
                <span>Entrar no Painel</span>
              </Link>
            </div>
          </div>
          
          <div className="mt-24 pt-8 border-t border-white/5 text-center text-[9px] font-bold uppercase tracking-[0.4em] text-stone-600">
            &copy; {new Date().getFullYear()} Salão {settings.venueTitle} | Crafted for Excellence
          </div>
        </div>
      </footer>

      {/* Modal de Orçamento */}
      {showBudgetModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-stone-900 border border-white/10 shadow-2xl p-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-serif text-3xl font-bold text-stone-100">Solicitar Orçamento</h3>
                <p className="text-stone-500 text-sm mt-2">Preencha os dados abaixo e entraremos em contato</p>
              </div>
              <button 
                onClick={() => setShowBudgetModal(false)} 
                className="text-stone-500 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>
            
            <form className="space-y-6" onSubmit={(e) => {
              e.preventDefault();
              const message = `Olá! Gostaria de solicitar um orçamento:\n\n` +
                `Nome: ${budgetForm.name}\n` +
                `Email: ${budgetForm.email}\n` +
                `Telefone: ${budgetForm.phone}\n` +
                `Tipo de Evento: ${budgetForm.eventType}\n` +
                `Data do Evento: ${budgetForm.eventDate}\n` +
                `Número de Convidados: ${budgetForm.guestCount}\n` +
                `Mensagem: ${budgetForm.message}`;
              
              const encodedMessage = encodeURIComponent(message);
              window.open(`https://wa.me/${settings.whatsapp || '5500000000000'}?text=${encodedMessage}`, '_blank');
              setShowBudgetModal(false);
              setBudgetForm({ name: '', email: '', phone: '', eventType: '', eventDate: '', guestCount: '', message: '' });
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2 block">
                    Nome Completo *
                  </label>
                  <input 
                    type="text" 
                    required
                    value={budgetForm.name}
                    onChange={e => setBudgetForm({...budgetForm, name: e.target.value})}
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-4 text-sm text-white focus:border-amber-500 outline-none"
                    placeholder="Seu nome"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2 block">
                    Email *
                  </label>
                  <input 
                    type="email" 
                    required
                    value={budgetForm.email}
                    onChange={e => setBudgetForm({...budgetForm, email: e.target.value})}
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-4 text-sm text-white focus:border-amber-500 outline-none"
                    placeholder="seu@email.com"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2 block">
                    Telefone/WhatsApp *
                  </label>
                  <input 
                    type="tel" 
                    required
                    value={budgetForm.phone}
                    onChange={e => setBudgetForm({...budgetForm, phone: e.target.value})}
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-4 text-sm text-white focus:border-amber-500 outline-none"
                    placeholder="(00) 00000-0000"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2 block">
                    Tipo de Evento *
                  </label>
                  <select
                    required
                    value={budgetForm.eventType}
                    onChange={e => setBudgetForm({...budgetForm, eventType: e.target.value})}
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-4 text-sm text-white focus:border-amber-500 outline-none"
                  >
                    <option value="">Selecione...</option>
                    <option value="casamento">Casamento</option>
                    <option value="formatura">Formatura</option>
                    <option value="aniversario">Aniversário</option>
                    <option value="corporativo">Corporativo</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2 block">
                    Data do Evento
                  </label>
                  <input 
                    type="date" 
                    value={budgetForm.eventDate}
                    onChange={e => setBudgetForm({...budgetForm, eventDate: e.target.value})}
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-4 text-sm text-white focus:border-amber-500 outline-none"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2 block">
                    Número de Convidados
                  </label>
                  <input 
                    type="number" 
                    value={budgetForm.guestCount}
                    onChange={e => setBudgetForm({...budgetForm, guestCount: e.target.value})}
                    className="w-full rounded-lg bg-stone-950 border border-white/10 p-4 text-sm text-white focus:border-amber-500 outline-none"
                    placeholder="Aprox. 100"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-2 block">
                  Mensagem Adicional
                </label>
                <textarea 
                  value={budgetForm.message}
                  onChange={e => setBudgetForm({...budgetForm, message: e.target.value})}
                  rows={4}
                  className="w-full rounded-lg bg-stone-950 border border-white/10 p-4 text-sm text-white focus:border-amber-500 outline-none resize-none"
                  placeholder="Conte-nos mais sobre seu evento..."
                />
              </div>
              
              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowBudgetModal(false)}
                  className="flex-1 rounded-lg border border-white/10 bg-stone-950 px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:bg-stone-800 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 rounded-lg bg-amber-600 px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-700 transition-all shadow-xl shadow-amber-900/40"
                >
                  Enviar via WhatsApp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicPage;
