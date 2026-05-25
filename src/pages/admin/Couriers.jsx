import { Edit3, Power, Save, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import AdminTable from '../../components/admin/AdminTable';
import EmptyState from '../../components/common/EmptyState';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import { useToast } from '../../components/common/ToastProvider';
import { useOperations } from '../../state/OperationsContext';
import { todayISO } from '../../utils/dateTime';
import { validateCourierForm } from '../../utils/validation';

const emptyForm = { fullName: '', username: '', password: '', phone: '', currentStatus: 'Mesai Bitti', restaurantId: '' };

export default function Couriers() {
  const { assignments, couriers, restaurants, addCourier, updateCourier, toggleCourierActive } = useOperations();
  const { notify } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    const errors = validateCourierForm(form);
    if (Object.keys(errors).length) {
      notify({ type: 'error', title: 'Eksik bilgi', message: Object.values(errors)[0] });
      return;
    }

    try {
      if (editingId) {
        updateCourier(editingId, form);
        notify({ title: 'Kurye güncellendi', message: form.fullName });
      } else {
        await addCourier(form);
        notify({ title: 'Kurye eklendi', message: `${form.username.trim().toLowerCase()}@dexa.com hesabı hazırlandı.` });
      }
      resetForm();
    } catch (error) {
      notify({ type: 'error', title: 'Kurye eklenemedi', message: error.message });
    }
  };

  const editCourier = (courier) => {
    setEditingId(courier.id);
    setForm({
      fullName: courier.fullName,
      username: courier.username,
      password: courier.password || '',
      phone: courier.phone,
      currentStatus: courier.status || courier.currentStatus || 'Mesai Bitti',
      restaurantId: courier.restaurantId || '',
    });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Kurye yönetimi"
        title="Kurye listesi ve yeni kayıt"
        description="Kurye hesapları, telefon bilgileri, aktiflik durumu ve restoran atamaları yönetilir."
        action={<button className="primary-button" type="button" onClick={resetForm}><UserPlus size={18} />Kurye ekle</button>}
      />
      <div className="management-grid">
        {couriers.length ? (
          <AdminTable columns={['Kurye', 'Telefon', 'Durum', 'Restoran', 'Vardiya', 'Hesap', 'İşlem']}>
            {couriers.map((courier) => {
              const nextAssignment = assignments
                .filter((assignment) => assignment.courierId === courier.id && assignment.status !== 'cancelled' && assignment.date >= todayISO())
                .sort((first, second) => `${first.date} ${first.startTime}`.localeCompare(`${second.date} ${second.startTime}`))[0];
              const restaurant = restaurants.find((item) => item.id === (nextAssignment?.restaurantId || courier.restaurantId));
              const shiftLabel = nextAssignment ? `${nextAssignment.startTime} - ${nextAssignment.endTime}` : 'Vardiya yok';
              return (
                <tr key={courier.id} className="border-b border-white/10 last:border-0">
                  <td className="px-5 py-4">
                    <strong className="block text-white">{courier.fullName}</strong>
                    <span className="text-sm text-dexa-muted">{courier.username}</span>
                  </td>
                  <td className="px-5 py-4 text-sm text-dexa-muted">{courier.phone}</td>
                  <td className="px-5 py-4"><StatusBadge>{courier.status}</StatusBadge></td>
                  <td className="px-5 py-4 text-sm text-dexa-muted">{restaurant?.name || '-'}</td>
                  <td className="px-5 py-4 text-sm text-white">{shiftLabel}</td>
                  <td className="px-5 py-4"><StatusBadge>{courier.active ? 'Aktif' : 'Pasif'}</StatusBadge></td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button className="secondary-button min-h-9 px-3" type="button" onClick={() => editCourier(courier)}><Edit3 size={15} />Düzenle</button>
                      <button className="secondary-button min-h-9 px-3" type="button" onClick={() => { toggleCourierActive(courier.id); notify({ title: 'Hesap durumu güncellendi', message: courier.fullName }); }}><Power size={15} />Aktif/Pasif</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </AdminTable>
        ) : (
          <EmptyState title="Henüz kurye eklenmedi" description="Kurye hesabı oluşturulduğunda liste ve vardiya atama akışı burada görünür." />
        )}
        <form className="glass-panel grid gap-4 p-5" onSubmit={submit}>
          <h2 className="text-xl font-bold text-white">{editingId ? 'Kurye düzenle' : 'Yeni kurye'}</h2>
          <input className="field" placeholder="Ad soyad" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
          <input className="field" placeholder="Kullanıcı adı" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
          <input className="field" placeholder="Şifre" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          <input className="field" placeholder="Telefon" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <select className="field" value={form.restaurantId} onChange={(event) => setForm({ ...form, restaurantId: event.target.value })}>
            <option value="">Restoran seç</option>
            {restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}
          </select>
          <select className="field" value={form.currentStatus} onChange={(event) => setForm({ ...form, currentStatus: event.target.value })}>
            <option>Çalışıyor</option>
            <option>Molada</option>
            <option>Mesai Bitti</option>
          </select>
          <button className="primary-button" type="submit"><Save size={18} />Kaydet</button>
          <button className="secondary-button" type="button" onClick={resetForm}><X size={18} />İptal</button>
        </form>
      </div>
    </div>
  );
}
