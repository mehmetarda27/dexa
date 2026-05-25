import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
import { useToast } from '../components/common/ToastProvider';
import { envValidation } from '../config/env';
import { login, resetPassword } from '../services/authService';
import { validateLogin } from '../utils/validation';

export default function Login() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { notify } = useToast();
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const errors = validateLogin(credentials);
    if (Object.keys(errors).length) {
      setError(Object.values(errors)[0]);
      return;
    }

    setLoading(true);
    try {
      const session = await login(credentials.username.trim(), credentials.password);
      navigate(['admin', 'super_admin'].includes(session.role) ? '/admin/dashboard' : '/courier/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
      notify({ type: 'error', title: 'Giriş başarısız', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async () => {
    try {
      await resetPassword(credentials.username);
      notify({ title: 'Şifre sıfırlama gönderildi', message: 'E-posta kutunuzu kontrol edin.' });
    } catch (err) {
      notify({ type: 'error', title: 'Şifre sıfırlama başarısız', message: err.message });
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] shadow-panel backdrop-blur-2xl lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative min-h-[520px] overflow-hidden p-8 md:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(41,211,255,0.26),transparent_22rem),radial-gradient(circle_at_75%_65%,rgba(47,125,246,0.22),transparent_22rem)]" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <Logo />
            <div>
              <span className="eyebrow">Operasyon erişimi</span>
              <h1 className="mt-4 max-w-2xl text-4xl font-black leading-tight tracking-tight text-white md:text-6xl">
                Restoran vardiyaları ve kurye mesaileri tek merkezde.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-dexa-muted">
                Dexa; restoran ataması, menzil doğrulaması, mesai onayı ve kazanç takibini role göre ayrılmış panellerde yönetir.
              </p>
            </div>
            <div className="grid gap-3 text-sm text-dexa-muted sm:grid-cols-3">
              {['100 m menzil kontrolü', '225 TL saatlik ücret', 'Rol bazlı panel'].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <ShieldCheck className="mb-3 text-dexa-cyan" size={18} />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="border-t border-white/10 bg-[#070b16]/90 p-8 lg:border-l lg:border-t-0 md:p-12">
          <div className="mb-8">
            <span className="eyebrow">Güvenli giriş</span>
            <h2 className="mt-3 text-3xl font-black text-white">Dexa hesabınızla giriş yapın</h2>
          </div>
          {envValidation.hasBlockingProductionIssue && (
            <div className="mb-5 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
              Firebase ayarları eksik. Yayın ortamında giriş için Vercel Environment Variables alanlarına Firebase config değerlerini ekleyin.
            </div>
          )}
          <form className="grid gap-5" onSubmit={submit}>
            <label className="grid gap-2 text-sm font-semibold text-dexa-ink">
              Kullanıcı adı
              <input
                className="field"
                value={credentials.username}
                onChange={(event) => setCredentials((current) => ({ ...current, username: event.target.value }))}
                autoComplete="username"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-dexa-ink">
              Şifre
              <input
                className="field"
                type="password"
                value={credentials.password}
                onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))}
                autoComplete="current-password"
              />
            </label>
            {error && <p className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{error}</p>}
            <button className="primary-button w-full" type="submit" disabled={loading}>
              <LockKeyhole size={18} />
              {loading ? 'Giriş kontrol ediliyor' : 'Giriş yap'}
              <ArrowRight size={18} />
            </button>
            <button className="secondary-button w-full" type="button" onClick={forgotPassword} disabled={loading}>
              Şifremi unuttum
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
