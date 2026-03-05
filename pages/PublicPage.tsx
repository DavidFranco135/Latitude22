import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Instagram, MessageCircle, MapPin, Mail, Calendar,
  X, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon,
  Play, Pause, Lock, Sparkles, ChevronRight, ArrowRight,
  CalendarCheck, Clock, CreditCard
} from 'lucide-react';
import { collection, onSnapshot, doc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getDatasOcupadas } from '../services/reservas';

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

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DIAS  = ['D','S','T','Q','Q','S','S'];

// ── Mini calendário de disponibilidade (somente leitura) ─────────────────────
const MiniCalendario: React.FC<{ datasOcupadas: string[] }> = ({ datasOcupadas }) => {
  const today = new Date();
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const prevMonth = () => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); };
  const nextMonth = () => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); };

  const firstDay    = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1)
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white transition-colors">
          <ChevronLeftIcon size={16} />
        </button>
        <span className="text-sm font-bold text-white uppercase tracking-widest">
          {MESES[calMonth]} {calYear}
        </span>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-white transition-colors">
          <ChevronRightIcon size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {DIAS.map((d, i) => (
          <div key={i} className="text-center text-[9px] font-bold text-stone-600 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr  = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const cellDate = new Date(dateStr + 'T12:00:00');
          const isPast   = cellDate < today;
          const isOcup   = datasOcupadas.includes(dateStr);
          const dow      = cellDate.getDay();
          const isWE     = dow === 0 || dow === 6;

          let cls = 'aspect-square rounded-md flex items-center justify-center text-[11px] font-medium ';
          if (isPast)      cls += 'text-stone-800';
          else if (isOcup) cls += 'bg-red-900/30 text-red-700 line-through';
          else if (isWE)   cls += 'text-amber-400 bg-amber-600/5';
          else             cls += 'text-stone-400 bg-stone-900/50';

          return <div key={i} className={cls}>{day}</div>;
        })}
      </div>

      <div className="flex gap-4 mt-4 text-[9px] text-stone-500 justify-center">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-red-900/50 inline-block"/>Ocupado
        </span>
        <span className="flex items-center gap-1.5 text-amber-500">
          <span className="w-2.5 h-2.5 rounded bg-amber-600/20 inline-block"/>Fim de semana
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-stone-700 inline-block"/>Disponível
        </span>
      </div>
    </div>
  );
};

// ── Modal: Reservar Online ou WhatsApp ───────────────────────────────────────
const ModalReserva: React.FC<{
  onClose: () => void;
  whatsapp: string;
  salonNome: string;
}> = ({ onClose, whatsapp, salonNome }) => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/90 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl bg-stone-900 border border-white/10 shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-8 pb-6 border-b border-white/5">
          <button onClick={onClose}
            className="absolute top-5 right-5 text-stone-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-amber-500" />
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-amber-500">
              {salonNome}
            </span>
          </div>
          <h3 className="font-serif text-2xl font-bold text-white">Como deseja reservar?</h3>
          <p className="text-stone-500 text-sm mt-1">Escolha a forma mais conveniente para você.</p>
        </div>

        {/* Opções */}
        <div className="p-6 space-y-4">
          {/* Opção 1 — Online */}
          <button
            onClick={() => { onClose(); navigate('/reserva'); }}
            className="group w-full text-left rounded-xl bg-amber-600/10 border border-amber-600/30 hover:border-amber-500 hover:bg-amber-600/20 p-5 transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-lg bg-amber-600/20 text-amber-500 flex-shrink-0 mt-0.5">
                <CalendarCheck size={20} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-white">Reservar Online</p>
                  <span className="text-[9px] bg-amber-600/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-600/20 font-bold uppercase tracking-wider">
                    Recomendado
                  </span>
                </div>
                <p className="text-stone-400 text-xs mt-1.5 leading-relaxed">
                  Escolha a data, veja os valores, pague a reserva e confirme tudo pelo sistema — rápido e seguro.
                </p>
                <div className="flex flex-wrap gap-3 mt-3">
                  {['Escolha a data', 'Veja os valores', 'Pague online'].map(item => (
                    <span key={item} className="flex items-center gap-1 text-[9px] text-amber-500 font-semibold">
                      <span className="w-1 h-1 rounded-full bg-amber-500 inline-block"/>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end mt-3 text-amber-500 text-xs font-bold group-hover:gap-2 gap-1 transition-all">
              Acessar calendário <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform"/>
            </div>
          </button>

          {/* Opção 2 — WhatsApp */}
          <a
            href={`https://wa.me/${whatsapp || '5521000000000'}?text=${encodeURIComponent('Olá! Gostaria de saber sobre disponibilidade de datas e valores.')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="group w-full flex items-start gap-4 rounded-xl bg-green-900/10 border border-green-900/30 hover:border-green-600/50 hover:bg-green-900/20 p-5 transition-all"
          >
            <div className="p-2.5 rounded-lg bg-green-900/30 text-green-500 flex-shrink-0 mt-0.5">
              <MessageCircle size={20} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-white">Falar pelo WhatsApp</p>
              <p className="text-stone-400 text-xs mt-1.5 leading-relaxed">
                Converse diretamente com nossa equipe para tirar dúvidas e combinar os detalhes.
              </p>
            </div>
            <ArrowRight size={16} className="text-stone-600 group-hover:text-green-500 mt-1 flex-shrink-0 group-hover:translate-x-0.5 transition-all" />
          </a>
        </div>

        <div className="px-6 pb-6">
          <button onClick={onClose}
            className="w-full py-3 rounded-lg border border-white/5 text-xs font-bold uppercase tracking-widest text-stone-600 hover:text-stone-400 transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Página Principal ──────────────────────────────────────────────────────────
const PublicPage: React.FC = () => {
  const navigate = useNavigate();
  const [albums,        setAlbums]       = useState<any[]>([]);
  const [photos,        setPhotos]       = useState<any[]>([]);
  const [selectedAlbum, setSelectedAlbum]= useState<any>(null);
  const [slides,        setSlides]       = useState<SlideItem[]>([]);
  const [currentSlide,  setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying]= useState(true);
  const [datasOcupadas, setDatasOcup]    = useState<string[]>([]);
  const [settings, setSettings] = useState<any>({
    coverImage: '', heroImage: '', venueTitle: '', venueSubtitle: 'Eventos & Festas',
    whatsapp: '', instagram: '', address: '', email: ''
  });

  const [showReservaModal,  setShowReservaModal]  = useState(false);
  const [showGalleryModal,  setShowGalleryModal]  = useState(false);
  const [showLightbox,      setShowLightbox]      = useState(false);
  const [lightboxImage,     setLightboxImage]     = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxImages,    setLightboxImages]    = useState<any[]>([]);

  useEffect(() => {
    const unsubAlbums = onSnapshot(
      collection(db, 'albums'),
      snap => {
        const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAlbums(items.sort((a: any, b: any) => {
          const dA = a.createdAt?.toDate?.() || new Date(0);
          const dB = b.createdAt?.toDate?.() || new Date(0);
          return dB.getTime() - dA.getTime();
        }));
      },
      err => console.warn('Álbuns:', err.message)
    );

    const unsubSlides = onSnapshot(
      query(collection(db, 'slides'), orderBy('order', 'asc')),
      snap => setSlides(snap.docs.map(d => ({ id: d.id, ...d.data() } as SlideItem))),
      err => console.warn('Slides:', err.message)
    );

    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'general'),
      snap => { if (snap.exists()) setSettings((p: any) => ({ ...p, ...snap.data() })); },
      err => console.warn('Settings:', err.message)
    );

    // Datas ocupadas para o mini-calendário
    getDatasOcupadas().then(setDatasOcup).catch(() => {});

    return () => { unsubAlbums(); unsubSlides(); unsubSettings(); };
  }, []);

  // Auto-play slider
  useEffect(() => {
    if (!isAutoPlaying || slides.length === 0) return;
    const id = setInterval(() => setCurrentSlide(p => (p + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, [isAutoPlaying, slides.length]);

  // Fotos do álbum selecionado
  useEffect(() => {
    if (!selectedAlbum) return;
    const q = query(collection(db, 'photos'), where('albumId', '==', selectedAlbum.id));
    const unsub = onSnapshot(q, snap =>
      setPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    return () => unsub();
  }, [selectedAlbum]);

  // Keyboard lightbox
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (!showLightbox) return;
      if (e.key === 'Escape') { setShowLightbox(false); }
      if (e.key === 'ArrowRight') {
        const ni = (currentImageIndex + 1) % lightboxImages.length;
        setCurrentImageIndex(ni); setLightboxImage(lightboxImages[ni].url);
      }
      if (e.key === 'ArrowLeft') {
        const pi = (currentImageIndex - 1 + lightboxImages.length) % lightboxImages.length;
        setCurrentImageIndex(pi); setLightboxImage(lightboxImages[pi].url);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [showLightbox, currentImageIndex, lightboxImages]);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const openWhatsApp = () => {
    const msg = encodeURIComponent('Olá! Gostaria de saber mais sobre o espaço.');
    window.open(`https://wa.me/${settings.whatsapp || '5521000000000'}?text=${msg}`, '_blank');
  };

  const openAlbum = (album: any) => { setSelectedAlbum(album); setShowGalleryModal(true); };

  const openLightbox = (url: string, imgs: any[], idx: number) => {
    setLightboxImage(url); setLightboxImages(imgs); setCurrentImageIndex(idx); setShowLightbox(true);
  };

  const nextSlide = () => { setCurrentSlide(p => (p + 1) % slides.length); setIsAutoPlaying(false); };
  const prevSlide = () => { setCurrentSlide(p => (p - 1 + slides.length) % slides.length); setIsAutoPlaying(false); };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 selection:bg-amber-600 selection:text-white">

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-stone-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between p-4 md:px-8">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex flex-col items-center group">
            <span className="font-serif text-xl font-bold tracking-[0.4em] text-white group-hover:text-amber-500 transition-colors uppercase">
              {settings.venueTitle || 'Latitude22'}
            </span>
            <span className="text-[9px] uppercase tracking-[0.6em] text-amber-600 font-bold -mt-0.5">
              {settings.venueSubtitle || 'Eventos & Festas'}
            </span>
          </button>

          <div className="hidden space-x-10 text-[10px] font-bold uppercase tracking-[0.3em] md:flex">
            <button onClick={() => scrollTo('disponibilidade')} className="hover:text-amber-500 transition-colors">
              Disponibilidade
            </button>
            <button onClick={() => scrollTo('galeria')} className="hover:text-amber-500 transition-colors">
              Galeria
            </button>
            <button onClick={() => scrollTo('contato')} className="hover:text-amber-500 transition-colors">
              Contato
            </button>
            <Link to="/login" className="flex items-center space-x-2 text-stone-500 hover:text-white transition-colors">
              <Lock size={12} /><span>Gestor</span>
            </Link>
          </div>

          {/* Botão principal — abre modal */}
          <button
            onClick={() => setShowReservaModal(true)}
            className="rounded-sm bg-amber-600 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-amber-500 transition-all shadow-xl shadow-amber-900/20 flex items-center gap-2"
          >
            <Calendar size={14} />
            <span className="hidden sm:inline">Reservar Data</span>
            <span className="sm:hidden">Reservar</span>
          </button>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="relative flex h-screen items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={settings.coverImage || settings.heroImage}
            className="h-full w-full object-cover opacity-90"
            alt="Hero"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/40 via-stone-950/60 to-stone-950" />
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
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setShowReservaModal(true)}
              className="w-full sm:w-auto px-10 py-4 bg-amber-600 text-white text-[9px] font-bold uppercase tracking-widest hover:bg-amber-500 transition-all flex items-center justify-center gap-2 shadow-2xl shadow-amber-900/40"
            >
              <CalendarCheck size={16} />
              Verificar Disponibilidade e Reservar
            </button>
            <button
              onClick={() => scrollTo('galeria')}
              className="w-full sm:w-auto px-10 py-4 border border-white/20 text-white text-[8px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              Ver Portfólio
            </button>
          </div>
        </div>
      </section>

      {/* ── SLIDER ─────────────────────────────────────────────────────────── */}
      {slides.length > 0 && (
        <section className="relative bg-stone-950 py-0">
          <div className="mx-auto max-w-7xl">
            <div className="relative h-[500px] md:h-[600px] overflow-hidden rounded-2xl border border-white/5 shadow-2xl">
              {slides.map((slide, index) => (
                <div key={slide.id}
                  className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                    index === currentSlide ? 'opacity-100 translate-x-0'
                    : index < currentSlide ? 'opacity-0 -translate-x-full'
                    : 'opacity-0 translate-x-full'
                  }`}
                >
                  {slide.type === 'image' && slide.url && (
                    <div className="relative h-full w-full">
                      <img src={slide.url} alt={slide.title || 'Slide'}
                        className="h-full w-full object-cover cursor-pointer"
                        onClick={() => {
                          const imgs = slides.filter(s => s.type === 'image' && s.url);
                          openLightbox(slide.url!, imgs, imgs.findIndex(s => s.id === slide.id));
                        }}
                      />
                      {(slide.title || slide.description) && (
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-transparent flex items-end">
                          <div className="p-8 md:p-16 max-w-3xl">
                            {slide.title && <h3 className="font-serif text-3xl md:text-5xl font-bold text-white mb-4">{slide.title}</h3>}
                            {slide.description && <p className="text-stone-300 text-lg">{slide.description}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {slide.type === 'video' && slide.url && (
                    <div className="relative h-full w-full bg-stone-950">
                      <video src={slide.url} className="h-full w-full object-cover" autoPlay muted loop playsInline />
                    </div>
                  )}
                  {slide.type === 'text' && (
                    <div className="h-full w-full flex items-center justify-center p-8 md:p-16"
                      style={{ backgroundColor: slide.backgroundColor || '#0c0a09', color: slide.textColor || '#e7e5e4' }}>
                      <div className="max-w-4xl text-center">
                        {slide.title && <h3 className="font-serif text-4xl md:text-7xl font-bold mb-8">{slide.title}</h3>}
                        {slide.description && <p className="text-xl md:text-3xl leading-relaxed opacity-90">{slide.description}</p>}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {slides.length > 1 && (
                <>
                  <button onClick={prevSlide}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-4 rounded-full bg-stone-950/80 border border-white/10 text-white hover:bg-amber-600 hover:border-amber-600 transition-all">
                    <ChevronLeftIcon size={24} />
                  </button>
                  <button onClick={nextSlide}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-4 rounded-full bg-stone-950/80 border border-white/10 text-white hover:bg-amber-600 hover:border-amber-600 transition-all">
                    <ChevronRightIcon size={24} />
                  </button>
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center space-x-3">
                    {slides.map((_, i) => (
                      <button key={i} onClick={() => { setCurrentSlide(i); setIsAutoPlaying(false); }}
                        className={`h-2 rounded-full transition-all ${i === currentSlide ? 'w-12 bg-amber-600' : 'w-2 bg-white/40'}`} />
                    ))}
                  </div>
                  <button onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                    className="absolute bottom-6 right-6 z-10 p-3 rounded-full bg-stone-950/80 border border-white/10 text-white hover:bg-amber-600 transition-all">
                    {isAutoPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── SEÇÃO DISPONIBILIDADE ───────────────────────────────────────────── */}
      <section id="disponibilidade" className="py-24 px-4 bg-stone-950">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Esquerda — texto */}
            <div>
              <div className="inline-flex items-center gap-2 mb-6 bg-amber-600/10 px-4 py-2 rounded-full border border-amber-600/20">
                <Clock size={14} className="text-amber-500" />
                <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-amber-400">
                  Disponibilidade
                </span>
              </div>
              <h3 className="font-serif text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                Seu evento merece<br />a data certa
              </h3>
              <p className="text-stone-400 text-base leading-relaxed mb-8 max-w-md">
                Consulte o calendário ao lado e veja quais datas estão disponíveis para o seu evento. Reserve agora mesmo de forma simples e segura.
              </p>

              <div className="space-y-4 mb-10">
                {[
                  { icon: <CalendarCheck size={18} />, title: 'Escolha suas datas', desc: 'Selecione um ou mais dias no calendário' },
                  { icon: <CreditCard size={18} />, title: 'Reserve com facilidade', desc: `Pague apenas o percentual de reserva para garantir` },
                  { icon: <Sparkles size={18} />, title: 'Evento confirmado', desc: 'A data fica bloqueada para você imediatamente' },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-amber-600/10 text-amber-500 flex-shrink-0 border border-amber-600/10">
                      {icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{title}</p>
                      <p className="text-xs text-stone-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowReservaModal(true)}
                  className="flex items-center justify-center gap-2 px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest transition-all rounded-sm shadow-xl shadow-amber-900/30"
                >
                  <Calendar size={15} />
                  Reservar Agora
                </button>
                <button
                  onClick={openWhatsApp}
                  className="flex items-center justify-center gap-2 px-8 py-4 border border-white/10 text-stone-300 hover:text-white hover:border-white/20 text-[10px] font-bold uppercase tracking-widest transition-all rounded-sm"
                >
                  <MessageCircle size={15} />
                  Falar pelo WhatsApp
                </button>
              </div>
            </div>

            {/* Direita — calendário */}
            <div className="glass p-8 rounded-2xl border border-white/5 shadow-2xl">
              <div className="flex items-center gap-2 mb-6">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                  Calendário ao vivo
                </span>
              </div>
              <MiniCalendario datasOcupadas={datasOcupadas} />
              <div className="mt-6 pt-5 border-t border-white/5">
                <button
                  onClick={() => setShowReservaModal(true)}
                  className="w-full py-3.5 rounded-xl bg-amber-600/10 hover:bg-amber-600/20 border border-amber-600/20 hover:border-amber-600/40 text-amber-500 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                >
                  <Calendar size={14} />
                  Abrir calendário completo e reservar
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── GALERIA ─────────────────────────────────────────────────────────── */}
      <section id="galeria" className="relative py-24 px-4 bg-stone-950 border-t border-white/5">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center space-x-2 mb-4 bg-amber-600/20 px-4 py-2 rounded-full border border-amber-600/30">
              <Sparkles size={14} className="text-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-amber-100">Nosso Espaço</span>
            </div>
            <h3 className="font-serif text-4xl md:text-6xl font-bold text-white mb-4">
              Você merece um lugar assim
            </h3>
            <p className="text-stone-400 text-lg max-w-2xl mx-auto">
              Cada evento é único. Confira o nosso espaço.
            </p>
          </div>

          {albums.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {albums.map((album) => (
                <button key={album.id} onClick={() => openAlbum(album)}
                  className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-stone-900 border border-white/5 shadow-2xl hover:border-amber-500/30 transition-all">
                  {album.coverUrl
                    ? <img src={album.coverUrl} alt={album.name}
                        className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-all group-hover:scale-105 duration-500" />
                    : <div className="h-full w-full bg-gradient-to-br from-stone-800 to-stone-900 flex items-center justify-center">
                        <Sparkles size={48} className="text-stone-700" />
                      </div>
                  }
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-transparent opacity-0 group-hover:opacity-100 transition-all">
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h4 className="text-white font-bold text-xl mb-2 uppercase tracking-wide">{album.name}</h4>
                      {album.description && <p className="text-stone-400 text-sm line-clamp-2">{album.description}</p>}
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

          {/* CTA reserva após galeria */}
          <div className="mt-16 rounded-2xl border border-amber-600/20 bg-amber-600/5 p-10 text-center">
            <Sparkles size={32} className="mx-auto text-amber-500 mb-4" />
            <h4 className="font-serif text-3xl font-bold text-white mb-3">
              Seu evento pode ser o próximo
            </h4>
            <p className="text-stone-400 max-w-md mx-auto text-sm leading-relaxed mb-8">
              Garanta já a sua data antes que alguém o faça. O processo é rápido, seguro e 100% online.
            </p>
            <button
              onClick={() => setShowReservaModal(true)}
              className="inline-flex items-center gap-2 px-10 py-4 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest transition-all rounded-sm shadow-xl shadow-amber-900/30"
            >
              <Calendar size={15} />
              Quero Reservar Minha Data
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER / CONTATO ─────────────────────────────────────────────────── */}
      <footer id="contato" className="relative border-t border-white/5 bg-stone-950 py-20 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <h4 className="mb-6 font-serif text-2xl font-bold tracking-[0.2em] text-white uppercase">
                {settings.venueTitle || 'Latitude22'}
              </h4>
              <p className="text-sm text-stone-500 leading-relaxed">
                Transformando momentos especiais em memórias eternas desde o primeiro dia.
              </p>
            </div>

            {settings.whatsapp && (
              <div>
                <h5 className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-600">Contato Rápido</h5>
                <button onClick={openWhatsApp}
                  className="flex items-center space-x-3 text-stone-400 hover:text-white transition-all">
                  <MessageCircle size={18} className="text-amber-600" />
                  <span className="text-sm">WhatsApp</span>
                </button>
                {settings.email && (
                  <button onClick={() => window.location.href = `mailto:${settings.email}`}
                    className="flex items-center space-x-3 text-stone-400 hover:text-white transition-all mt-3">
                    <Mail size={18} className="text-amber-600" />
                    <span className="text-sm">Email</span>
                  </button>
                )}
              </div>
            )}

            {settings.instagram && (
              <div>
                <h5 className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-600">Redes Sociais</h5>
                <button onClick={() => window.open(settings.instagram.replace('@',''), '_blank')}
                  className="flex items-center space-x-3 text-stone-400 hover:text-white transition-all">
                  <Instagram size={18} className="text-amber-600" />
                  <span className="text-sm">{settings.instagram}</span>
                </button>
              </div>
            )}

            {settings.address && (
              <div>
                <h5 className="mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-amber-600">Localização</h5>
                <button
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`, '_blank')}
                  className="flex items-start space-x-3 text-stone-400 hover:text-white transition-all text-left">
                  <MapPin size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{settings.address}</span>
                </button>
              </div>
            )}
          </div>

          {/* Bloco de reserva no footer */}
          <div className="mt-16 rounded-xl border border-white/5 bg-stone-900 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Pronto para reservar?</p>
              <p className="text-white font-bold text-lg">Garanta sua data agora mesmo</p>
            </div>
            <button
              onClick={() => setShowReservaModal(true)}
              className="flex-shrink-0 flex items-center gap-2 px-8 py-3.5 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest transition-all rounded-sm shadow-lg shadow-amber-900/30"
            >
              <Calendar size={14} />
              Reservar Data
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-[9px] font-bold uppercase tracking-[0.4em] text-stone-600">
              &copy; {new Date().getFullYear()} {settings.venueTitle || 'Latitude22'} | Produzido por NIKLAUS
            </div>
            <Link to="/login"
              className="inline-flex items-center space-x-3 rounded-sm bg-stone-950 border border-white/5 px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-stone-400 hover:bg-amber-600 hover:text-white hover:border-amber-600 transition-all shadow-2xl">
              <Lock size={14} />
              <span>Entrar no Painel</span>
            </Link>
          </div>
        </div>
      </footer>

      {/* ── MODAL RESERVA / WHATSAPP ─────────────────────────────────────────── */}
      {showReservaModal && (
        <ModalReserva
          onClose={() => setShowReservaModal(false)}
          whatsapp={settings.whatsapp}
          salonNome={settings.venueTitle || 'Latitude22'}
        />
      )}

      {/* ── MODAL GALERIA ────────────────────────────────────────────────────── */}
      {showGalleryModal && selectedAlbum && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/95 backdrop-blur-sm p-4">
          <div className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl bg-stone-900 border border-white/10 shadow-2xl p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-serif text-3xl font-bold text-stone-100">{selectedAlbum.name}</h3>
                {selectedAlbum.description && <p className="text-stone-500 text-sm mt-2">{selectedAlbum.description}</p>}
              </div>
              <button onClick={() => { setShowGalleryModal(false); setSelectedAlbum(null); setPhotos([]); }}
                className="text-stone-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
            {photos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {photos.map((photo, index) => (
                  <button key={photo.id} onClick={() => openLightbox(photo.url, photos, index)}
                    className="group relative aspect-square overflow-hidden rounded-xl bg-stone-950 border border-white/5 shadow-xl hover:border-amber-500/30 transition-all">
                    <img src={photo.url} alt={photo.title}
                      className="h-full w-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 duration-500" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <Sparkles size={64} className="mx-auto text-stone-800 mb-4" />
                <p className="text-stone-600 text-lg">Nenhuma foto neste álbum ainda.</p>
              </div>
            )}

            {/* CTA dentro da galeria */}
            <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-stone-400 text-sm">Gostou do que viu? Reserve sua data agora.</p>
              <button
                onClick={() => { setShowGalleryModal(false); setShowReservaModal(true); }}
                className="flex items-center gap-2 px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold uppercase tracking-widest transition-all rounded-sm shadow-lg"
              >
                <Calendar size={14} />
                Reservar Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX ─────────────────────────────────────────────────────────── */}
      {showLightbox && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setShowLightbox(false)}>
          <button onClick={() => setShowLightbox(false)}
            className="absolute top-6 right-6 z-10 p-3 rounded-full bg-stone-950/80 border border-white/10 text-white hover:bg-amber-600 transition-all">
            <X size={24} />
          </button>
          {lightboxImages.length > 1 && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full bg-stone-950/80 border border-white/10 text-white text-sm font-bold">
              {currentImageIndex + 1} / {lightboxImages.length}
            </div>
          )}
          {lightboxImages.length > 1 && (
            <button onClick={e => {
              e.stopPropagation();
              const pi = (currentImageIndex - 1 + lightboxImages.length) % lightboxImages.length;
              setCurrentImageIndex(pi); setLightboxImage(lightboxImages[pi].url);
            }} className="absolute left-6 top-1/2 -translate-y-1/2 z-10 p-4 rounded-full bg-stone-950/80 border border-white/10 text-white hover:bg-amber-600 transition-all">
              <ChevronLeftIcon size={32} />
            </button>
          )}
          <div className="relative max-w-7xl max-h-[90vh] w-full h-full flex items-center justify-center p-20"
            onClick={e => e.stopPropagation()}>
            <img src={lightboxImage} alt="Visualização"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
          </div>
          {lightboxImages.length > 1 && (
            <button onClick={e => {
              e.stopPropagation();
              const ni = (currentImageIndex + 1) % lightboxImages.length;
              setCurrentImageIndex(ni); setLightboxImage(lightboxImages[ni].url);
            }} className="absolute right-6 top-1/2 -translate-y-1/2 z-10 p-4 rounded-full bg-stone-950/80 border border-white/10 text-white hover:bg-amber-600 transition-all">
              <ChevronRightIcon size={32} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PublicPage;
