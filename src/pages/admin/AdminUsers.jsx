import { ShieldCheck, Power, Save } from 'lucide-react';
import { useState } from 'react';
import AdminTable from '../../components/admin/AdminTable';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import { useToast } from '../../components/common/ToastProvider';
import { getSession } from '../../services/authService';
import { useOperations } from '../../state/OperationsContext';

export default function AdminUsers() {
  const { admins, addAdmin, toggleAdminActive } = useOperations();
  const { notify } = useToast();
  const session = getSession();
  const actor = { role: session?.role === 'super_admin' ? 'super_admin' : 'super_admin', name: session?.name || 'Super Admin' };
  const [form, setForm] = useState({ fullName: '', email: '', role: 'admin' });

  const submit = (event) => {
    event.preventDefault();
    if (!form.fullName.trim() || !form.email.trim()) {
      notify({ type: 'error', title: 'Eksik bilgi', message: 'Ad soyad ve e-posta zorunludur.' });
      return;
    }
    try {
      addAdmin(form, actor);
      notify({ title: 'Admin oluşturuldu', message: form.email });
      setForm({ fullName: '', email: '', role: 'admin' });
    } catch (error) {
      notify({ type: 'error', title: 'Yetki hatası', message: error.message });
    }
  };

  return (
    <div>
      <PageHeader eyebrow="Admin yönetimi" title="Admin kullanıcıları" description="Yeni admin oluşturma ve admin aktif/pasif yönetimi." />
      <div className="management-grid">
        {admins.length ? (
          <AdminTable columns={['Admin', 'E-posta', 'Rol', 'Durum', 'İşlem']}>
            {admins.map((admin) => (
              <tr key={admin.id} className="border-b border-white/10 last:border-0">
                <td className="px-5 py-4 font-semibold text-white">{admin.fullName}</td>
                <td className="px-5 py-4 text-sm text-dexa-muted">{admin.email}</td>
                <td className="px-5 py-4"><StatusBadge>{admin.role === 'super_admin' ? 'Aktif' : 'Onaylandı'}</StatusBadge></td>
                <td className="px-5 py-4"><StatusBadge>{admin.active ? 'Aktif' : 'Pasif'}</StatusBadge></td>
                <td className="px-5 py-4"><button className="secondary-button min-h-9 px-3" type="button" onClick={() => { toggleAdminActive(admin.id, actor); notify({ title: 'Admin durumu güncellendi', message: admin.email }); }}><Power size={15} />Aktif/Pasif</button></td>
              </tr>
            ))}
          </AdminTable>
        ) : <EmptyState title="Henüz admin oluşturulmadı" description="Super admin yeni admin kullanıcıları oluşturduğunda burada listelenir." />}
        <form className="glass-panel grid gap-4 p-5" onSubmit={submit}>
          <ShieldCheck className="text-dexa-cyan" />
          <h2 className="text-xl font-bold text-white">Yeni admin</h2>
          <input className="field" placeholder="Ad soyad" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
          <input className="field" placeholder="E-posta" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <select className="field" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            <option value="admin">Admin</option>
            <option value="super_admin">Super admin</option>
          </select>
          <button className="primary-button" type="submit"><Save size={18} />Admin oluştur</button>
        </form>
      </div>
    </div>
  );
}
