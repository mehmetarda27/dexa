import { Link } from 'react-router-dom';
import Logo from '../components/common/Logo';

export default function Unauthorized() {
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <section className="glass-panel max-w-xl rounded-[2rem] p-8 text-center">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <h1 className="text-3xl font-black text-white">Yetkisiz erişim</h1>
        <p className="mt-3 text-sm leading-6 text-dexa-muted">Bu sayfaya erişmek için gerekli rol veya yetki bulunmuyor.</p>
        <Link className="primary-button mt-6" to="/login">Giriş ekranına dön</Link>
      </section>
    </main>
  );
}
