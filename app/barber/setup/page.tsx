'use client';

import { useState, useEffect } from 'react';
import { supabase, isConfigured } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { MapPin, Scissors, Save, ArrowLeft, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function BarberSetupPage() {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const router = useRouter();

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocalização não suportada pelo seu navegador.');
      return;
    }

    setGeoError(null);
    
    const options = {
      enableHighAccuracy: false, // Changed to false for better compatibility in iframes
      timeout: 15000, // Increased timeout
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setGeoError(null);
      },
      (err) => {
        console.error('Geo error:', err);
        if (err.code === 1) {
          setGeoError('Permissão de localização negada. Verifique as configurações do seu navegador e se o site tem permissão.');
        } else if (err.code === 3) {
          setGeoError('Tempo esgotado ao tentar obter localização.');
        } else {
          setGeoError('Erro ao detectar localização.');
        }
      },
      options
    );
  };

  useEffect(() => {
    detectLocation();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) return;
    setLoading(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Não autenticado');

      const { data: shop, error: shopError } = await supabase
        .from('barbershops')
        .insert([{
          owner_id: user.id,
          name,
          address,
          latitude: lat || 0,
          longitude: lng || 0
        }])
        .select()
        .single();

      if (shopError) throw shopError;

      // Add some default services
      const defaultServices = [
        { barbershop_id: shop.id, name: 'Corte Masculino', price: 50 },
        { barbershop_id: shop.id, name: 'Barba', price: 30 },
        { barbershop_id: shop.id, name: 'Corte + Barba', price: 70 }
      ];

      const { error: svcError } = await supabase
        .from('services')
        .insert(defaultServices);

      if (svcError) throw svcError;

      toast.success('Barbearia cadastrada com sucesso!');
      router.push('/');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black text-center">
        <AlertCircle className="text-red-500 mb-4" size={48} />
        <h2 className="text-xl font-bold mb-2">Configuração Necessária</h2>
        <p className="text-zinc-400 mb-6">Configure as chaves do Supabase para continuar.</p>
        <button onClick={() => router.push('/')} className="gold-gradient text-black font-bold py-3 px-8 rounded-xl">Voltar</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6">
      <header className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-display font-bold">Configurar Barbearia</h1>
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Nome da Barbearia</label>
            <div className="relative">
              <Scissors className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input 
                type="text" 
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-gold"
                placeholder="Ex: Barber Shop Premium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Endereço</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input 
                type="text" 
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-gold"
                placeholder="Rua, Número, Bairro"
              />
            </div>
          </div>

          <div className="p-4 glass rounded-2xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-zinc-400">Localização GPS:</p>
              <button 
                type="button"
                onClick={detectLocation}
                className="text-[10px] uppercase font-bold text-gold hover:underline"
              >
                Tentar Novamente
              </button>
            </div>
            <div className="flex items-center justify-between text-xs font-mono text-zinc-500">
              <span>Lat: {lat?.toFixed(6) || (geoError ? '---' : 'Detectando...')}</span>
              <span>Lng: {lng?.toFixed(6) || (geoError ? '---' : 'Detectando...')}</span>
            </div>
            {geoError && (
              <div className="mt-2 space-y-1">
                <p className="text-[10px] text-red-400 flex items-center gap-1">
                  <AlertCircle size={10} /> {geoError}
                </p>
                <p className="text-[9px] text-zinc-500 leading-tight">
                  Dica: Se estiver no navegador, clique no ícone de cadeado na barra de endereço e verifique se a localização está permitida para este site.
                </p>
              </div>
            )}
          </div>

          <button 
            disabled={loading}
            className="w-full gold-gradient text-black font-bold py-5 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar e Continuar'}
            {!loading && <Save size={20} />}
          </button>
          {!lat && !geoError && (
            <p className="text-center text-[10px] text-zinc-500">Aguardando localização para melhor precisão...</p>
          )}
          {!lat && geoError && (
            <p className="text-center text-[10px] text-amber-500/70 italic">Você pode continuar sem GPS, mas sua barbearia não aparecerá nas buscas por proximidade.</p>
          )}
        </form>
      </motion.div>
    </div>
  );
}
