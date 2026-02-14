
import React, { useState, useEffect } from 'react';
import { Save, Camera, Instagram, MessageCircle, Phone, Globe, Sparkles } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<any>({
    heroImage: '',
    aboutImage: '',
    venueTitle: 'LATITUDE22',
    venueSubtitle: 'Eventos & Festas',
    address: '',
    whatsapp: '',
    instagram: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      const docSnap = await getDoc(doc(db, 'settings', 'general'));
      if (docSnap.exists()) {
        setSettings(docSnap.data());
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    try {
      await setDoc(doc(db, 'settings', 'general'), settings, { merge: true });
      setMessage('Identidade atualizada com sucesso!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Erro ao salvar configurações.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-600 mb-1">
            <Sparkles size={16} />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Branding & Visual</span>
          </div>
          <h2 className="font-serif text-4xl font-bold text-stone-100 tracking-tight">Personalização do Site</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {message && (
            <div className={`p-4 rounded-lg text-[10px] font-bold uppercase tracking-widest text-center animate-bounce ${message.includes('Erro') ? 'bg-red-500/20 text-red-500 border border-red-500/20' : 'bg-green-500/20 text-green-500 border border-green-500/20'}`}>
              {message}
            </div>
          )}

          {/* Branding Images */}
          <div className="rounded-2xl border border-white/5 bg-stone-900 p-8 shadow-2xl">
            <h3 className="mb-8 font-bold text-stone-100 flex items-center">
              <Camera size={18} className="mr-2 text-amber-500" />
              Impacto Visual (Imagens)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 block">Capa Principal (Hero Image)</label>
                <div className="relative group aspect-video rounded-xl overflow-hidden bg-stone-950 border border-white/5">
                  <img src={settings.heroImage || 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3'} className="h-full w-full object-cover opacity-40 group-hover:opacity-60 transition-all" alt="" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <input
                      type="url"
                      value={settings.heroImage}
                      onChange={e => setSettings({...settings, heroImage: e.target.value})}
                      className="w-4/5 rounded-lg border border-white/10 bg-stone-900/80 backdrop-blur-md py-3 px-4 text-xs text-stone-200 placeholder:text-stone-600 focus:ring-1 focus:ring-amber-500 outline-none"
                      placeholder="Coloque a URL da foto..."
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 block">Destaque Secundário (Sobre)</label>
                <div className="relative group aspect-video rounded-xl overflow-hidden bg-stone-950 border border-white/5">
                  <img src={settings.aboutImage || 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622'} className="h-full w-full object-cover opacity-40 group-hover:opacity-60 transition-all" alt="" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <input
                      type="url"
                      value={settings.aboutImage}
                      onChange={e => setSettings({...settings, aboutImage: e.target.value})}
                      className="w-4/5 rounded-lg border border-white/10 bg-stone-900/80 backdrop-blur-md py-3 px-4 text-xs text-stone-200 placeholder:text-stone-600 focus:ring-1 focus:ring-amber-500 outline-none"
                      placeholder="URL da imagem secundária..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Identity */}
          <div className="rounded-2xl border border-white/5 bg-stone-900 p-8 shadow-2xl">
            <h3 className="mb-8 font-bold text-stone-100">Identidade Textual</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">Nome do Venue (Título)</label>
                <input
                  type="text"
                  value={settings.venueTitle}
                  onChange={e => setSettings({...settings, venueTitle: e.target.value})}
                  className="w-full rounded-lg border border-white/10 bg-stone-950 p-4 text-sm text-stone-200 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500">Segmento (Subtítulo)</label>
                <input
                  type="text"
                  value={settings.venueSubtitle}
                  onChange={e => setSettings({...settings, venueSubtitle: e.target.value})}
                  className="w-full rounded-lg border border-white/10 bg-stone-950 p-4 text-sm text-stone-200 focus:ring-1 focus:ring-amber-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Socials */}
          <div className="rounded-2xl border border-white/5 bg-stone-900 p-8 shadow-2xl">
            <h3 className="mb-8 font-bold text-stone-100">Canais de Atendimento</h3>
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-stone-950 rounded-xl text-amber-500 border border-white/5"><Instagram size={20} /></div>
                <input
                  type="text"
                  value={settings.instagram}
                  onChange={e => setSettings({...settings, instagram: e.target.value})}
                  className="flex-1 rounded-lg border border-white/10 bg-stone-950 p-4 text-sm text-stone-200 outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="@latitude22_"
                />
              </div>
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-stone-950 rounded-xl text-green-500 border border-white/5"><MessageCircle size={20} /></div>
                <input
                  type="text"
                  value={settings.whatsapp}
                  onChange={e => setSettings({...settings, whatsapp: e.target.value})}
                  className="flex-1 rounded-lg border border-white/10 bg-stone-950 p-4 text-sm text-stone-200 outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="5511999999999"
                />
              </div>
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-stone-950 rounded-xl text-stone-400 border border-white/5"><Globe size={20} /></div>
                <input
                  type="text"
                  value={settings.address}
                  onChange={e => setSettings({...settings, address: e.target.value})}
                  className="flex-1 rounded-lg border border-white/10 bg-stone-950 p-4 text-sm text-stone-200 outline-none focus:ring-1 focus:ring-amber-500"
                  placeholder="Endereço Completo do Local"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              onClick={handleSave}
              disabled={loading}
              className="flex items-center justify-center space-x-3 rounded-xl bg-amber-600 px-10 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-white hover:bg-amber-700 shadow-2xl shadow-amber-900/40 disabled:opacity-50 transition-all hover:-translate-y-1"
            >
              <Save size={18} />
              <span>{loading ? 'Processando...' : 'Aplicar Identidade Visual'}</span>
            </button>
          </div>
        </div>

        {/* Info Column */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/5 bg-stone-900 p-8 shadow-2xl">
            <h3 className="mb-6 font-bold text-stone-100">Status do Branding</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                <span className="text-stone-500">Hero Section</span>
                <span className={settings.heroImage ? 'text-green-500' : 'text-red-500'}>{settings.heroImage ? 'Online' : 'Vazio'}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                <span className="text-stone-500">SEO Title</span>
                <span className="text-amber-500">Configurado</span>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-white/5">
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-stone-600 mb-2">Dica de Gestor</p>
              <p className="text-xs text-stone-400 leading-relaxed italic">"Imagens de alta resolução capturadas em eventos reais aumentam a conversão de orçamentos em 40%."</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
