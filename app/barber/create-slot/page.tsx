'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Scissors, Clock, DollarSign, ArrowLeft, Check } from 'lucide-react';
import { motion } from 'motion/react';

export default function CreateSlotPage() {
  const [loading, setLoading] = useState(false);
  const [barbershop, setBarbershop] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const router = useRouter();

  const [formData, setFormData] = useState({
    service_id: '',
    slot_time: '',
    original_price: '',
    discount_price: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/auth');

      // Get barbershop
      const { data: shop } = await supabase
        .from('barbershops')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (!shop) {
        toast.error('Você precisa cadastrar sua barbearia primeiro');
        return router.push('/barber/setup');
      }
      setBarbershop(shop);

      // Get services
      const { data: svcs } = await supabase
        .from('services')
        .select('*')
        .eq('barbershop_id', shop.id);
      
      setServices(svcs || []);
    };

    fetchData();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('slots')
        .insert([{
          barbershop_id: barbershop.id,
          service_id: formData.service_id,
          slot_time: new Date(formData.slot_time).toISOString(),
          original_price: parseFloat(formData.original_price),
          discount_price: parseFloat(formData.discount_price),
          status: 'available'
        }]);

      if (error) throw error;

      toast.success('Vaga publicada com sucesso!');
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
        <button onClick={() => router.back()} className="p-2 rounded-full bg-white/5 text-zinc-400">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-display font-bold">Publicar Vaga</h1>
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Serviço</label>
            <select 
              required
              value={formData.service_id}
              onChange={(e) => {
                const svc = services.find(s => s.id === e.target.value);
                setFormData({
                  ...formData, 
                  service_id: e.target.value,
                  original_price: svc ? svc.price.toString() : ''
                });
              }}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 focus:outline-none focus:border-gold appearance-none"
            >
              <option value="" className="bg-zinc-900">Selecionar serviço</option>
              {services.map(svc => (
                <option key={svc.id} value={svc.id} className="bg-zinc-900">{svc.name} - R${svc.price}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Horário Disponível</label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
              <input 
                type="datetime-local" 
                required
                value={formData.slot_time}
                onChange={(e) => setFormData({...formData, slot_time: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Preço Original</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                <input 
                  type="number" 
                  required
                  readOnly
                  value={formData.original_price}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 focus:outline-none opacity-50"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Preço Flash</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-neon" size={20} />
                <input 
                  type="number" 
                  required
                  value={formData.discount_price}
                  onChange={(e) => setFormData({...formData, discount_price: e.target.value})}
                  className="w-full bg-white/5 border border-neon/20 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-neon text-neon font-bold"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          <div className="p-4 glass rounded-2xl border-l-4 border-neon">
            <p className="text-sm text-zinc-400">
              Dica: Descontos acima de <span className="text-neon font-bold">30%</span> costumam ser reservados em menos de 15 minutos.
            </p>
          </div>

          <button 
            disabled={loading}
            className="w-full gold-gradient text-black font-bold py-5 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-50"
          >
            {loading ? 'Publicando...' : 'Publicar Vaga Flash'}
            {!loading && <Check size={20} />}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
