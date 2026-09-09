import { useState } from 'react';
import {
  Lock,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Globe,
  ArrowRight,
  Bot,
  Building2,
  Volume2,
  Activity,
  Zap,
  Check
} from 'lucide-react';

export default function App() {
  const [email, setEmail] = useState('cliente@helpusbr.com');
  const [password, setPassword] = useState('••••••••••••');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggedIn(true);
  };

  const ssoDestinations = [
    { name: 'HelpUS Hub Central', domain: 'hub.helpusbr.com', url: 'https://hub.helpusbr.com', icon: Globe },
    { name: 'HelpUS Search Engine', domain: 'search.helpusbr.com', url: 'https://search.helpusbr.com', icon: Globe },
    { name: 'HelpUS Admin Dashboard', domain: 'admin.helpusbr.com', url: 'https://admin.helpusbr.com', icon: Activity },
    { name: 'HelpUS AI Agent Studio', domain: 'agent.helpusbr.com', url: 'https://agent.helpusbr.com', icon: Bot },
    { name: 'HelpUS Voice SaaS', domain: 'voice.helpusbr.com', url: 'https://voice.helpusbr.com', icon: Volume2 },
    { name: 'HelpUS Imóveis Pro', domain: 'realestate.helpusbr.com', url: 'https://realestate.helpusbr.com', icon: Building2 },
    { name: 'HelpUS Pay Engine', domain: 'pay.helpusbr.com', url: 'https://pay.helpusbr.com', icon: Zap }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Lock className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-2">
                HelpUS <span className="text-indigo-400">Auth SSO</span>
              </span>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">
                Central de Autenticação Unificada
              </span>
            </div>
          </div>

          <a
            href="https://hub.helpusbr.com"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700 flex items-center gap-2 transition-all"
          >
            <Globe className="w-4 h-4 text-indigo-400" />
            <span>Voltar ao Hub</span>
          </a>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 flex items-center justify-center p-6 my-8">
        <div className="max-w-md w-full space-y-6">
          
          {isLoggedIn ? (
            /* Logged In SSO Switcher Card */
            <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto text-2xl">
                  ✓
                </div>
                <h2 className="text-2xl font-extrabold text-white">Sessão Autenticada (SSO)</h2>
                <span className="text-xs text-indigo-400 font-mono block">{email}</span>
              </div>

              <div className="space-y-3 pt-2">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">
                  Acesso Direto com Token SSO:
                </span>

                {ssoDestinations.map((dest) => {
                  const IconComp = dest.icon;
                  return (
                    <a
                      key={dest.domain}
                      href={dest.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3.5 rounded-2xl bg-slate-950 hover:bg-indigo-950/50 border border-slate-800 hover:border-indigo-500/40 transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-slate-900 text-indigo-400 border border-slate-800">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-extrabold text-xs text-white block group-hover:text-indigo-300">
                            {dest.name}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{dest.domain}</span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                    </a>
                  );
                })}
              </div>

              <button
                onClick={() => setIsLoggedIn(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold text-xs"
              >
                Encerrar Sessão
              </button>
            </div>
          ) : (
            /* Login Form */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-extrabold uppercase">
                  <ShieldCheck className="w-3.5 h-3.5" /> Single Sign-On 256-bit
                </div>
                <h2 className="text-2xl font-extrabold text-white">Acessar Conta HelpUS</h2>
                <p className="text-xs text-slate-400 font-medium">
                  Digite suas credenciais para navegar em todos os sistemas do ecossistema.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    E-mail Corporativo
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Senha
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded bg-slate-950 border-slate-800 text-indigo-600" />
                    <span>Lembrar neste dispositivo</span>
                  </label>
                  <a href="#" className="text-indigo-400 font-bold hover:underline">Esqueceu a senha?</a>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <span>Entrar com SSO HelpUS</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 bg-slate-900 text-center text-xs text-slate-500 font-medium">
        © 2026 HelpUS Technology Solutions — Auth SSO Central.
      </footer>
    </div>
  );
}
