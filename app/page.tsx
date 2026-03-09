'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase, isConfigured } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  Scissors, 
  MapPin, 
  Clock, 
  Filter, 
  Search, 
  User as UserIcon, 
  LogOut,
  Plus,
  LayoutDashboard,
  History,
  TrendingUp,
  ChevronRight,
  Star,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Profile {
  id: string;
  name: string;
  role: 'client' | 'barber';
}

interface Slot {
  id: string;
  barbershop_id: string;
  original_price: number;
  discount_price: number;
  slot_time: string;
  status: string;
  barbershop: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  service: {
    name: string;
  };
}

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'favorites' | 'profile'>('home');
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [distanceFilter, setDistanceFilter] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      if (!isConfigured) {
        setError('Configuração Necessária');
        setLoading(false);
        return;
      }

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          router.push('/auth');
          return;
        }
        setUser(user);
        
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileError) throw profileError;
        setProfile(profileData);
        
        // Fetch favorites
        const { data: favs } = await supabase
          .from('favorites')
          .select('barbershop_id')
          .eq('user_id', user.id);
        setFavorites(favs?.map(f => f.barbershop_id) || []);

        // Fetch history
        const { data: hist } = await supabase
          .from('bookings')
          .select(`
            *,
            slot:slots(
              *,
              barbershop:barbershops(*),
              service:services(*)
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        setHistory(hist || []);
        
        // Fetch slots after profile is loaded
        const { data: slotsData, error: slotsError } = await supabase
          .from('slots')
          .select(`
            *,
            barbershop:barbershops(*),
            service:services(*)
          `)
          .eq('status', 'available')
          .gte('slot_time', new Date().toISOString())
          .order('slot_time', { ascending: true });
        
        if (slotsError) throw slotsError;
        setSlots(slotsData || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Erro de conexão');
        toast.error('Falha ao conectar com o servidor');
      } finally {
        setLoading(false);
      }
    };

    checkUser();
    
    // Get location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const toggleFavorite = async (barbershopId: string) => {
    if (!user) return;
    
    const isFav = favorites.includes(barbershopId);
    try {
      if (isFav) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('barbershop_id', barbershopId);
        setFavorites(favorites.filter(id => id !== barbershopId));
        toast.success('Removido dos favoritos');
      } else {
        await supabase
          .from('favorites')
          .insert([{ user_id: user.id, barbershop_id: barbershopId }]);
        setFavorites([...favorites, barbershopId]);
        toast.success('Adicionado aos favoritos');
      }
    } catch (err) {
      toast.error('Erro ao atualizar favoritos');
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !isConfigured) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black text-center">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500 mb-6">
          <AlertCircle size={48} />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">
          {!isConfigured ? 'Configuração do Supabase' : 'Erro de Conexão'}
        </h2>
        <p className="text-zinc-400 max-w-xs mb-8">
          {!isConfigured 
            ? 'Você precisa configurar as chaves do Supabase no painel de Segredos (Secrets) do AI Studio.'
            : 'Não foi possível conectar ao banco de dados. Verifique suas chaves e conexão.'}
        </p>
        
        {!isConfigured && (
          <div className="glass p-6 rounded-2xl w-full max-w-sm text-left space-y-4 mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">Variáveis Necessárias:</p>
            <code className="block bg-white/5 p-3 rounded-lg text-xs text-gold">
              NEXT_PUBLIC_SUPABASE_URL<br/>
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>
            <a 
              href="https://supabase.com" 
              target="_blank" 
              className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition-colors"
            >
              Criar projeto no Supabase <ExternalLink size={14} />
            </a>
          </div>
        )}

        <button 
          onClick={() => window.location.reload()}
          className="gold-gradient text-black font-bold py-4 px-8 rounded-xl"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <header className="p-6 flex items-center justify-between sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/5">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tighter flex items-center gap-2">
            <Scissors className="text-gold" size={24} />
            BarberFlash
          </h1>
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">
            {profile?.role === 'barber' ? 'Painel Barbearia' : 'Encontre seu corte'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleLogout} className="p-2 rounded-full bg-white/5 text-zinc-400 hover:text-white transition-colors">
            <LogOut size={20} />
          </button>
          <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center text-black font-bold">
            {profile?.name?.charAt(0) || 'U'}
          </div>
        </div>
      </header>

      <main className="p-6 max-w-2xl mx-auto space-y-8">
        {profile?.role === 'client' ? (
          <>
            {activeTab === 'home' && (
              <>
                {/* Happy Hour Section */}
                <div className="glass p-6 rounded-3xl border-l-4 border-gold relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2">
                    <div className="bg-gold text-black text-[10px] font-bold px-2 py-0.5 rounded-bl-lg uppercase">Promoção</div>
                  </div>
                  <h3 className="text-xl font-display font-bold mb-1">Happy Hour BarberFlash ⏰</h3>
                  <p className="text-sm text-zinc-400 mb-4">Todos os dias das 18h às 19h, cortes selecionados com 40% OFF!</p>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-zinc-800 flex items-center justify-center text-[10px] font-bold">
                          {String.fromCharCode(64 + i)}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-zinc-500 font-medium">+12 pessoas reservaram hoje</span>
                  </div>
                </div>

                {/* Search & Filter */}
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                    <input 
                      type="text" 
                      placeholder="Buscar barbearia ou serviço..."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-gold transition-colors"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {[3, 5, 10, 20].map((dist) => (
                      <button 
                        key={dist}
                        onClick={() => setDistanceFilter(dist)}
                        className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-all ${distanceFilter === dist ? 'bg-gold text-black font-bold' : 'bg-white/5 text-zinc-400 border border-white/10'}`}
                      >
                        Até {dist}km
                      </button>
                    ))}
                  </div>
                </div>

                {/* Slots List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold">Vagas Próximas</h2>
                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{slots.length} vagas</span>
                  </div>

                  {slots.length === 0 ? (
                    <div className="text-center py-12 glass rounded-3xl">
                      <Clock className="mx-auto text-zinc-600 mb-4" size={48} />
                      <p className="text-zinc-400">Nenhuma vaga disponível no momento.</p>
                      <p className="text-xs text-zinc-600 mt-1">Tente aumentar o raio de busca.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {slots.map((slot) => {
                        const dist = location ? calculateDistance(location.lat, location.lng, slot.barbershop.latitude, slot.barbershop.longitude) : null;
                        if (dist && dist > distanceFilter) return null;

                        return (
                          <motion.div 
                            key={slot.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="glass p-5 rounded-3xl relative overflow-hidden group hover:border-gold/30 transition-colors"
                          >
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="font-bold text-lg">{slot.barbershop.name}</h3>
                                <div className="flex items-center gap-1 text-zinc-500 text-sm">
                                  <MapPin size={14} />
                                  <span>{slot.barbershop.address} • {dist ? `${dist.toFixed(1)}km` : '...'}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => toggleFavorite(slot.barbershop_id)}
                                  className={`p-2 rounded-full transition-colors ${favorites.includes(slot.barbershop_id) ? 'text-gold bg-gold/10' : 'text-zinc-500 bg-white/5'}`}
                                >
                                  <Star size={18} fill={favorites.includes(slot.barbershop_id) ? 'currentColor' : 'none'} />
                                </button>
                                <div className="bg-neon/10 text-neon px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider neon-glow">
                                  -{Math.round((1 - slot.discount_price / slot.original_price) * 100)}%
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <p className="text-zinc-400 text-sm">{slot.service.name}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-zinc-500 line-through text-sm">R${slot.original_price}</span>
                                  <span className="text-2xl font-bold text-white">R${slot.discount_price}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-1 text-gold text-sm font-bold mb-2">
                                  <Clock size={14} />
                                  <span>{format(new Date(slot.slot_time), 'HH:mm', { locale: ptBR })}</span>
                                </div>
                                <button 
                                  onClick={() => router.push(`/booking/${slot.id}`)}
                                  className="gold-gradient text-black px-6 py-2 rounded-xl font-bold text-sm hover:scale-105 transition-transform"
                                >
                                  Reservar
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === 'history' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-display font-bold">Meu Histórico</h2>
                {history.length === 0 ? (
                  <div className="text-center py-12 glass rounded-3xl">
                    <History className="mx-auto text-zinc-600 mb-4" size={48} />
                    <p className="text-zinc-400">Você ainda não fez nenhuma reserva.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {history.map((item) => (
                      <div key={item.id} className="glass p-5 rounded-3xl border-l-4 border-gold">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold">{item.slot.barbershop.name}</h3>
                          <span className="text-[10px] uppercase font-bold tracking-widest text-neon bg-neon/10 px-2 py-1 rounded-md">
                            {item.payment_status === 'paid' ? 'Confirmado' : item.payment_status}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400 mb-1">{item.slot.service.name}</p>
                        <div className="flex items-center justify-between text-xs text-zinc-500">
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            <span>{format(new Date(item.slot.slot_time), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}</span>
                          </div>
                          <span className="font-bold text-white">R$ {item.slot.discount_price}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'favorites' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-display font-bold">Favoritos</h2>
                {favorites.length === 0 ? (
                  <div className="text-center py-12 glass rounded-3xl">
                    <Star className="mx-auto text-zinc-600 mb-4" size={48} />
                    <p className="text-zinc-400">Sua lista de favoritos está vazia.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {/* In a real app, we'd fetch the full barbershop details for favorites */}
                    <p className="text-zinc-500 text-sm italic">Aqui aparecerão as barbearias que você marcou como favoritas.</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* Barber Dashboard */
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="glass p-6 rounded-3xl space-y-2">
                <TrendingUp className="text-neon" size={24} />
                <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Faturamento</p>
                <p className="text-2xl font-bold">R$ 1.240</p>
              </div>
              <div className="glass p-6 rounded-3xl space-y-2">
                <History className="text-gold" size={24} />
                <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">Reservas</p>
                <p className="text-2xl font-bold">28</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Vagas Ativas</h2>
                <button 
                  onClick={() => router.push('/barber/create-slot')}
                  className="bg-white text-black px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2"
                >
                  <Plus size={18} />
                  Nova Vaga
                </button>
              </div>

              <div className="space-y-3">
                {/* Mocked active slots for barber */}
                {[1, 2].map((i) => (
                  <div key={i} className="glass p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-gold">
                        <Scissors size={24} />
                      </div>
                      <div>
                        <p className="font-bold">Corte Masculino</p>
                        <p className="text-xs text-zinc-500">Hoje às 15:30 • R$35</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-neon bg-neon/10 px-2 py-1 rounded-md">Ativa</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-bold">Próximas Reservas</h2>
              <div className="space-y-3">
                <div className="glass p-4 rounded-2xl border-l-4 border-gold">
                  <div className="flex justify-between mb-2">
                    <p className="font-bold">João Silva</p>
                    <p className="text-gold font-bold">14:00</p>
                  </div>
                  <p className="text-sm text-zinc-400">Corte + Barba • Pago via Pix</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-md border-t border-white/5 z-50">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'home' ? 'text-gold' : 'text-zinc-500'}`}
          >
            <LayoutDashboard size={24} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Início</span>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-gold' : 'text-zinc-500'}`}
          >
            <History size={24} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Histórico</span>
          </button>
          <button 
            onClick={() => setActiveTab('favorites')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'favorites' ? 'text-gold' : 'text-zinc-500'}`}
          >
            <Star size={24} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Favoritos</span>
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 ${activeTab === 'profile' ? 'text-gold' : 'text-zinc-500'}`}
          >
            <UserIcon size={24} />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Perfil</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
