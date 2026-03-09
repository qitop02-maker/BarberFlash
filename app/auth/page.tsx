'use client';

import { useState, useEffect } from 'react';
import { supabase, isConfigured } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { Scissors, User, Mail, Lock, ArrowRight, AlertCircle, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'client' | 'barber'>('client');
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfigured) {
      toast.error('Supabase não configurado');
      return;
    }
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Bem-vindo de volta!');
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { name, role }
          }
        });
        if (signUpError) throw signUpError;
        
        if (data.user) {
          // Create profile record
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{ id: data.user.id, name, email, role }]);
          if (profileError) throw profileError;
        }
        toast.success('Conta criada com sucesso!');
      }
      router.push('/');
    } catch (error: any) {
      toast.error(error.message || 'Falha na autenticação');
    } finally {
      setLoading(false);
    }
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black text-center">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500 mb-6">
          <AlertCircle size={48} />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">Configuração Necessária</h2>
        <p className="text-zinc-400 max-w-xs mb-8">
          Você precisa configurar as chaves do Supabase no painel de Segredos (Secrets) do AI Studio para usar o BarberFlash.
        </p>
        
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-black">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gold text-black mb-4">
            <Scissors size={32} />
          </div>
          <h1 className="text-4xl font-display font-bold tracking-tighter">BarberFlash</h1>
          <p className="text-zinc-400 mt-2">Corte de última hora com preço de promoção.</p>
        </div>

        <div className="glass p-8 rounded-3xl space-y-6">
          <div className="flex p-1 bg-white/5 rounded-xl">
            <button 
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${isLogin ? 'bg-white/10 text-white' : 'text-zinc-500'}`}
            >
              Entrar
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!isLogin ? 'bg-white/10 text-white' : 'text-zinc-500'}`}
            >
              Cadastrar
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-gold transition-colors"
                      placeholder="Seu nome"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Tipo de Conta</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      type="button"
                      onClick={() => setRole('client')}
                      className={`py-3 rounded-xl border text-sm transition-all ${role === 'client' ? 'border-gold bg-gold/10 text-gold' : 'border-white/10 text-zinc-500'}`}
                    >
                      Cliente
                    </button>
                    <button 
                      type="button"
                      onClick={() => setRole('barber')}
                      className={`py-3 rounded-xl border text-sm transition-all ${role === 'barber' ? 'border-gold bg-gold/10 text-gold' : 'border-white/10 text-zinc-500'}`}
                    >
                      Barbearia
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-gold transition-colors"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-gold transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              disabled={loading}
              className="w-full gold-gradient text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 mt-4"
            >
              {loading ? 'Processando...' : isLogin ? 'Entrar' : 'Criar Conta'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
