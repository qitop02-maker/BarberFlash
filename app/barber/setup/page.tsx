'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { MapPin, Scissors, Save, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

export default function BarberSetupPage() {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

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
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

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
            <p className="text-sm text-zinc-400 mb-2">Localização GPS:</p>
            <div className="flex items-center justify-between text-xs font-mono text-zinc-500">
              <span>Lat: {lat?.toFixed(6) || 'Detectando...'}</span>
              <span>Lng: {lng?.toFixed(6) || 'Detectando...'}</span>
            </div>
          </div>

          <button 
            disabled={loading || !lat}
            className="w-full gold-gradient text-black font-bold py-5 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar e Continuar'}
            {!loading && <Save size={20} />}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
