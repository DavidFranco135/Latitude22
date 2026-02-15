import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, MessageCircle, MapPin, Phone, ChevronRight, Lock, Sparkles, Mail, Calendar, X, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, Play, Pause } from 'lucide-react';
import { collection, onSnapshot, doc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';

interface SlideItem {
  id: string;
  type: 'image' | 'video' | 'text';
  url?: string;
  title?: string;
  description?: string;
  backgroundColor?: string;
  textColor?: string;
  order: number;
  createdAt?: any;
}

const PublicPage: React.FC = () => {
  const [albums, setAlbums] = useState<any[]>([]);
  const [photos, setPhotos] = useState<any[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [settings, setSettings] = useState<any>({
    coverImage: '',
    heroImage: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&q=100',
    aboutImage: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&q=80',
    venueSubtitle: 'Eventos & Festas',
    whatsapp: '',
    instagram: '',
    address: '',
    email: ''
  });

  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
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
    // Busca Álbuns
    const unsubAlbums = onSnapshot(
      collection(db, 'albums'),
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAlbums(items.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        }));
      },
      (error) => console.warn("Erro ao carregar álbuns:", error.message)
    );

    // Busca Slides
    const unsubSlides = onSnapshot(
      query(collection(db, 'slides'), orderBy('order', 'asc')),
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SlideItem));
        setSlides(items);
      },
      (error) => console.warn("Erro ao carregar slides:", error.message)
    );

    // Busca Configurações
    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'general'),
      (docSnap) => {
        if (docSnap.exists()) {
          setSettings(prev => ({ ...prev, ...docSnap.data() }));
        }
      },
      (error) => console.warn("Erro ao carregar configurações:", error.message)
    );

    return () => {
      unsubAlbums();
      unsubSlides();
      unsubSettings();
    };
  }, []);

  // Auto-play do slider
  useEffect(() => {
    if (!isAutoPlaying || slides.length === 0) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000); // Muda a cada 5 segundos

    return () => clearInterval(interval);
  }, [isAutoPlaying, slides.length]);

  // Carregar fotos do álbum selecionado
  useEffect(() => {
    if (!selectedAlbum) return;
    
    const q = query(collection(db, 'photos'), where('albumId', '==', selectedAlbum.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPhotos(items);
    });

    return () => unsubscribe();
  }, [selectedAlbum]);

  const openWhatsApp = () => {
    const phone = settings.whatsapp || '5500000000000';
    const message = encodeURIComponent('Olá! Gostaria de saber mais sobre o espaço e disponibilidade de datas.');
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  const openInstagram = () => {
    const instagram = settings.instagram || 'latitude22_';
    const username = instagram.replace('@', '');
    window.open(`https://instagram.com/${username}`, '_blank');
  };

  const openEmail = () => {
    const email = settings.email || 'contato@latitude22.com';
    const subject = encodeURIComponent('Solicitação de Orçamento');
    const body = encodeURIComponent('Olá! Gostaria de solicitar um orçamento para meu evento.');
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const openMap = () => {
    const address = settings.address || 'Latitude22 Eventos';
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const openAlbum = (album: any) => {
    setSelectedAlbum(album);
    setShowGalleryModal(true);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
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
            className="h-full w-full object-cover opacity-20 scale-50" 
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
            Latitude22
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

      {/* SLIDER/CARROSSEL - NOVO */}
      {slides.length > 0 && (
        <section className="relative bg-stone-950 py-0">
          <div className="mx-auto max-w-7xl">
            <div className="relative h-[500px] md:h-[600px] overflow-hidden rounded-2xl border border-white/5 shadow-2xl">
              {/* Slides */}
              {slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                    index === currentSlide 
                      ? 'opacity-100 translate-x-0' 
                      : index < currentSlide 
                        ? 'opacity-0 -translate-x-full' 
                        : 'opacity-0 translate-x-full'
                  }`}
                >
                  {slide.type === 'image' && slide.url && (
                    <div className="relative h-full w-full">
                      <img 
                        src={slide.url} 
                        alt={slide.title || 'Slide'} 
                        className="h-full w-full object-cover"
                      />
                      {(slide.title || slide.description) && (
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-transparent flex items-end">
                          <div className="p-8 md:p-16 max-w-3xl">
                            {slide.title && (
                              <h3 className="font-serif text-3xl md:text-5xl font-bold text-white mb-4">
                                {slide.title}
                              </h3>
                            )}
                            {slide.description && (
                              <p className="text-stone-300 text-lg md:text-xl">
                                {slide.description}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {slide.type === 'video' && slide.url && (
                    <div className="relative h-full w-full bg-stone-950">
                      <video 
                        src={slide.url} 
                        className="h-full w-full object-cover"
                        autoPlay
                        muted
                        loop
                        playsInline
                      />
                      {(slide.title || slide.description) && (
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-transparent flex items-end pointer-events-none">
                          <div className="p-8 md:p-16 max-w-3xl">
                            {slide.title && (
                              <h3 className="font-serif text-3xl md:text-5xl font-bold text-white mb-4">
                                {slide.title}
                              </h3>
                            )}
                            {slide.description && (
                              <p className="text-stone-300 text-lg md:text-xl">
                                {slide.description}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {slide.type === 'text' && (
                    <div 
                      className="h-full w-full flex items-center justify-center p-8 md:p-16"
                      style={{ 
                        backgroundColor: slide.backgroundColor || '#0c0a09',
                        color: slide.textColor || '#e7e5e4'
                      }}
                    >
                      <div className="max-w-4xl text-center">
                        {slide.title && (
                          <h3 className="font-serif text-4xl md:text-7xl font-bold mb-8">
                            {slide.title}
                          </h3>
                        )}
                        {slide.description && (
                          <p className="text-xl md:text-3xl leading-relaxed opacity-90">
                            {slide.description}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Botões de Navegação */}
              {slides.length > 1 && (
                <>
                  <button
                    onClick={prevSlide}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-4 rounded-full bg-stone-950/80 border border-white/10 text-white hover:bg-amber-600 hover:border-amber-600 transition-all backdrop-blur-sm"
                  >
                    <ChevronLeftIcon size={24} />
                  </button>
                  
                  <button
                    onClick={nextSlide}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-4 rounded-full bg-stone-950/80 border border-white/10 text-white hover:bg-amber-600 hover:border-amber-600 transition-all backdrop-blur-sm"
                  >
                    <ChevronRightIcon size={24} />
                  </button>

                  {/* Indicadores */}
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center space-x-3">
                    {slides.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`h-2 rounded-full transition-all ${
                          index === currentSlide 
                            ? 'w-12 bg-amber-600' 
                            : 'w-2 bg-white/40 hover:bg-white/60'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Botão Play/Pause */}
                  <button
                    onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                    className="absolute bottom-6 right-6 z-10 p-3 rounded-full bg-stone-950/80 border border-white/10 text-white hover:bg-amber-600 hover:border-amber-600 transition-all backdrop-blur-sm"
                  >
                    {isAutoPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Galeria Section */}
      <section id="galeria" className="relative py-32 px-4 bg-stone-950">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 mb-4 bg-amber-600/20 px-4 py-2 rounded-full border border-amber-600/30">
              <Sparkles size={14} className="text-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-amber-100">
                Nosso Portfólio
              </span>
            </div>
            <h3 className="font-serif text-4xl md:text-6xl font-bold text-white mb-4">
              Momentos Inesquecíveis
            </h3>
            <p className="text-stone-400 text-lg max-w-2xl mx-auto">
              Cada evento é único. Conheça nossos trabalhos e inspire-se.
            </p>
          </div>

          {albums.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {albums.map((album) => (
                <button
                  key={album.id}
                  onClick={() => openAlbum(album)}
                  className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-stone-900 border border-white/5 shadow-2xl hover:border-amber-500/30 transition-all"
                >
                  {album.coverUrl ? (
                    <img 
                      src={album.coverUrl} 
                      alt={album.name} 
                      className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-all group-hover:scale-105 duration-500"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-stone-800 to-stone-900 flex items-center justify-center">
                      <Sparkles size={48} className="text-stone-700" />
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-transparent opacity-0 group-hover:opacity-100 transition-all">
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h4 className="text-white font-bold text-xl mb-2 uppercase tracking-wide">{album.name}</h4>
                      {album.description && (
                        <p className="text-stone-400 text-sm line-clamp-2">{album.description}</p>
                      )}
                      <div className="mt-4 flex items-center text-amber-500 text-sm font-bold">
                        <span>Ver Galeria</span>
                        <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Sparkles size={64} className="mx-auto text-stone-800 mb-4" />
              <p className="text-stone-600 text-lg">Em breve, nossos álbuns estarão disponíveis aqui.</p>
            </div>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <footer id="contato" className="relative border-t border-white/5 bg-stone-950 py-20 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <h4 className="mb-6 font-serif text-2xl font-bold tracking-[0.2em] text-white uppercase">{settings.venueTitle}</h4>
              <p className="text-sm text-stone-500 leading-relaxed">
                Transformando momentos especiais em memórias eternas desde o primeiro dia.
              </p>
            </div>
            
            {settings.whatsapp && (
              <div>
                <h5 className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-600">Contato Rápido</h5>
                <button onClick={openWhatsApp} className="group flex items-center space-x-3 text-stone-400 hover:text-white transition-all">
                  <MessageCircle size={18} className="text-amber-600" />
                  <span className="text-sm">WhatsApp</span>
                </button>
                {settings.email && (
                  <button onClick={openEmail} className="group flex items-center space-x-3 text-stone-400 hover:text-white transition-all mt-3">
                    <Mail size={18} className="text-amber-600" />
                    <span className="text-sm">Email</span>
                  </button>
                )}
              </div>
            )}
            
            {settings.instagram && (
              <div>
                <h5 className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-600">Redes Sociais</h5>
                <button onClick={openInstagram} className="group flex items-center space-x-3 text-stone-400 hover:text-white transition-all">
                  <Instagram size={18} className="text-amber-600" />
                  <span className="text-sm">{settings.instagram}</span>
                </button>
              </div>
            )}
            
            {settings.address && (
              <div>
                <h5 className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-600">Localização</h5>
                <button onClick={openMap} className="group flex items-start space-x-3 text-stone-400 hover:text-white transition-all text-left">
                  <MapPin size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{settings.address}</span>
                </button>
              </div>
            )}
          </div>
          
          <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-[9px] font-bold uppercase tracking-[0.4em] text-stone-600">
              &copy; {new Date().getFullYear()} Salão {settings.venueTitle} | Crafted for Excellence
            </div>
            <Link 
              to="/login" 
              className="inline-flex items-center space-x-3 rounded-sm bg-stone-950 border border-white/5 px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:bg-amber-600 hover:text-white hover:border-amber-600 transition-all shadow-2xl"
            >
              <Lock size={14} />
              <span>Entrar no Painel</span>
            </Link>
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
                className="text-stone-500 hover:text-white"
              >
                <X size={24} />
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

      {/* Modal de Galeria */}
      {showGalleryModal && selectedAlbum && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/95 backdrop-blur-sm p-4">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl bg-stone-900 border border-white/10 shadow-2xl p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-serif text-3xl font-bold text-stone-100">{selectedAlbum.name}</h3>
                {selectedAlbum.description && (
                  <p className="text-stone-500 text-sm mt-2">{selectedAlbum.description}</p>
                )}
              </div>
              <button 
                onClick={() => {
                  setShowGalleryModal(false);
                  setSelectedAlbum(null);
                  setPhotos([]);
                }}
                className="text-stone-500 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            
            {photos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {photos.map((photo) => (
                  <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl bg-stone-950 border border-white/5 shadow-xl hover:border-amber-500/30 transition-all">
                    <img 
                      src={photo.url} 
                      alt={photo.title} 
                      className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-all group-hover:scale-105 duration-500" 
                    />
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-transparent opacity-0 group-hover:opacity-100 transition-all">
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h4 className="text-white font-bold text-sm mb-1 uppercase tracking-wide">{photo.title}</h4>
                        {photo.description && (
                          <p className="text-stone-400 text-xs line-clamp-2">{photo.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <Sparkles size={64} className="mx-auto text-stone-800 mb-4" />
                <p className="text-stone-600 text-lg">Nenhuma foto neste álbum ainda.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicPage;
