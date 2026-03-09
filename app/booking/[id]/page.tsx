'use client';

import { useState, useEffect } from 'react';
import { supabase, isConfigured } from '@/lib/supabase';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Scissors, Clock, MapPin, CreditCard, ArrowLeft, CheckCircle2, QrCode, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function BookingPage() {
  const [loading, setLoading] = useState(true);
  const [slot, setSlot] = useState<any>(null);
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const fetchSlot = async () => {
      if (!isConfigured) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('slots')
          .select(`
            *,
            barbershop:barbershops(*),
            service:services(*)
          `)
          .eq('id', params.id)
          .single();

        if (error || !data) {
          toast.error('Vaga não encontrada');
          router.push('/');
          return;
        }

        if (data.status === 'reserved') {
          toast.error('Esta vaga já foi reservada');
          router.push('/');
          return;
        }

        setSlot(data);
      } catch (err: any) {
        toast.error('Erro ao carregar detalhes');
      } finally {
        setLoading(false);
      }
    };

    fetchSlot();
  }, [params.id, router]);

  const handlePayment = async () => {
    if (!isConfigured) return;
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Não autenticado');

      // 1. Check if slot is still available
      const { data: currentSlot, error: slotError } = await supabase
        .from('slots')
        .select('status')
        .eq('id', slot.id)
        .single();

      if (slotError || currentSlot?.status === 'reserved') {
        throw new Error('Vaga já reservada por outra pessoa');
      }

      // 2. Create booking
      const { error: bookingError } = await supabase
        .from('bookings')
        .insert([{
          slot_id: slot.id,
          user_id: user.id,
          payment_status: 'paid'
        }]);

      if (bookingError) throw bookingError;

      // 3. Update slot status
      const { error: updateError } = await supabase
        .from('slots')
        .update({ status: 'reserved' })
        .eq('id', slot.id);

      if (updateError) throw updateError;

      setStep('success');
      toast.success('Reserva confirmada!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar');
      router.push('/');
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

  if (loading && step === 'details') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="w-12 h-12 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6 pb-24">
      <header className="flex items-center gap-4 mb-8">
        {step !== 'success' && (
          <button onClick={() => step === 'payment' ? setStep('details') : router.back()} className="p-2 rounded-full bg-white/5 text-zinc-400">
            <ArrowLeft size={24} />
          </button>
        )}
        <h1 className="text-2xl font-display font-bold">
          {step === 'success' ? 'Confirmado!' : 'Finalizar Reserva'}
        </h1>
      </header>

      <AnimatePresence mode="wait">
        {step === 'details' && (
          <motion.div 
            key="details"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="glass p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center text-gold">
                  <Scissors size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{slot.barbershop.name}</h2>
                  <p className="text-zinc-500 text-sm flex items-center gap-1">
                    <MapPin size={14} /> {slot.barbershop.address}
                  </p>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Serviço</span>
                  <span className="font-bold">{slot.service.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Horário</span>
                  <div className="flex items-center gap-1 text-gold font-bold">
                    <Clock size={16} />
                    <span>{format(new Date(slot.slot_time), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass p-6 rounded-3xl space-y-4">
              <h3 className="text-sm uppercase tracking-widest text-zinc-500 font-bold">Resumo de Valores</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-zinc-500">
                  <span>Preço Original</span>
                  <span className="line-through">R$ {slot.original_price}</span>
                </div>
                <div className="flex justify-between text-neon font-bold text-lg">
                  <span>Preço Flash</span>
                  <span>R$ {slot.discount_price}</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setStep('payment')}
              className="w-full gold-gradient text-black font-bold py-5 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
            >
              Ir para o Pagamento
            </button>
          </motion.div>
        )}

        {step === 'payment' && (
          <motion.div 
            key="payment"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <h3 className="text-sm uppercase tracking-widest text-zinc-500 font-bold">Escolha o método</h3>
              
              <button 
                onClick={() => setPaymentMethod('pix')}
                className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center justify-between ${paymentMethod === 'pix' ? 'border-gold bg-gold/5' : 'border-white/5 bg-white/5'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white">
                    <QrCode size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold">Pix</p>
                    <p className="text-xs text-zinc-500">Confirmação instantânea</p>
                  </div>
                </div>
                {paymentMethod === 'pix' && <CheckCircle2 className="text-gold" />}
              </button>

              <button 
                onClick={() => setPaymentMethod('card')}
                className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center justify-between ${paymentMethod === 'card' ? 'border-gold bg-gold/5' : 'border-white/5 bg-white/5'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white">
                    <CreditCard size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold">Cartão de Crédito</p>
                    <p className="text-xs text-zinc-500">Até 12x no cartão</p>
                  </div>
                </div>
                {paymentMethod === 'card' && <CheckCircle2 className="text-gold" />}
              </button>
            </div>

            <div className="p-6 glass rounded-3xl text-center space-y-4">
              <p className="text-zinc-400 text-sm">Total a pagar</p>
              <p className="text-4xl font-bold text-white">R$ {slot.discount_price}</p>
            </div>

            <button 
              disabled={loading}
              onClick={handlePayment}
              className="w-full gold-gradient text-black font-bold py-5 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-50"
            >
              {loading ? 'Processando...' : `Pagar com ${paymentMethod === 'pix' ? 'Pix' : 'Cartão'}`}
            </button>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-8 py-12"
          >
            <div className="relative inline-block">
              <div className="w-32 h-32 rounded-full bg-neon/20 flex items-center justify-center text-neon">
                <CheckCircle2 size={64} />
              </div>
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-gold flex items-center justify-center text-black"
              >
                <Scissors size={20} />
              </motion.div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-display font-bold">Tudo pronto!</h2>
              <p className="text-zinc-400">Sua vaga flash está garantida. Apresente o código abaixo na barbearia.</p>
            </div>

            <div className="glass p-8 rounded-3xl border-2 border-dashed border-white/10 inline-block">
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-2">Código da Reserva</p>
              <p className="text-4xl font-mono font-bold tracking-tighter text-gold">BF-{slot.id.slice(0, 6).toUpperCase()}</p>
            </div>

            <div className="space-y-4">
              <button 
                onClick={() => router.push('/')}
                className="w-full bg-white text-black font-bold py-5 rounded-2xl"
              >
                Voltar para o Início
              </button>
              <p className="text-xs text-zinc-600">
                Um e-mail de confirmação foi enviado para você.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
