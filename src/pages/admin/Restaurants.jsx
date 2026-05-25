import { Building2, Edit3, MapPinned, Plus, Save, X } from 'lucide-react';
import { useState } from 'react';
import AdminTable from '../../components/admin/AdminTable';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import { useToast } from '../../components/common/ToastProvider';
import { useOperations } from '../../state/OperationsContext';
import { validateRestaurantForm } from '../../utils/validation';

const emptyForm = { name: '', district: '', lat: '', lng: '', radius: 100 };

export default function Restaurants() {
  const { restaurants, addRestaurant, updateRestaurant } = useOperations();
  const { notify } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const submit = (event) => {
    event.preventDefault();
    const errors = validateRestaurantForm(form);
    if (Object.keys(errors).length) {
      notify({ type: 'error', title: 'Eksik bilgi', message: Object.values(errors)[0] });
      return;
    }
    const payload = { ...form, lat: Number(form.lat), lng: Number(form.lng), radius: Number(form.radius) };
    if (editingId) {
      updateRestaurant(editingId, payload);
      notify({ title: 'Restoran güncellendi', message: form.name });
    } else {
      addRestaurant(payload);
      notify({ title: 'Restoran eklendi', message: form.name });
    }
    setForm(emptyForm);
    setEditingId(null);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Restoran yönetimi"
        title="Restoran listesi ve koordinatlar"
        description="Her restoran için koordinat ve 100 metre menzil bilgisi kayıtlıdır."
        action={<button className="primary-button" type="button" onClick={() => setForm(emptyForm)}><Building2 size={18} />Restoran ekle</button>}
      />
      <div className="management-grid">
        <AdminTable columns={['Restoran', 'Bölge', 'Koordinat', 'Menzil', 'Durum', 'İşlem']}>
          {restaurants.map((restaurant) => (
            <tr key={restaurant.id} className="border-b border-white/10 last:border-0">
              <td className="px-5 py-4 font-semibold text-white">{restaurant.name}</td>
              <td className="px-5 py-4 text-sm text-dexa-muted">{restaurant.district}</td>
              <td className="px-5 py-4 text-sm text-dexa-muted">{restaurant.lat}, {restaurant.lng}</td>
              <td className="px-5 py-4 text-sm text-white">{restaurant.radius} m</td>
              <td className="px-5 py-4"><StatusBadge>{restaurant.status || 'Aktif'}</StatusBadge></td>
              <td className="px-5 py-4">
                <button className="secondary-button min-h-9 px-3" type="button" onClick={() => { setEditingId(restaurant.id); setForm(restaurant); }}><Edit3 size={15} />Düzenle</button>
              </td>
            </tr>
          ))}
        </AdminTable>
        <form className="glass-panel grid gap-4 p-5" onSubmit={submit}>
          <h2 className="text-xl font-bold text-white">{editingId ? 'Restoran düzenle' : 'Yeni restoran'}</h2>
          <input className="field" placeholder="Restoran adı" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <input className="field" placeholder="Bölge" value={form.district} onChange={(event) => setForm({ ...form, district: event.target.value })} />
          <input className="field" placeholder="Latitude" value={form.lat} onChange={(event) => setForm({ ...form, lat: event.target.value })} />
          <input className="field" placeholder="Longitude" value={form.lng} onChange={(event) => setForm({ ...form, lng: event.target.value })} />
          <input className="field" placeholder="Radius" value={form.radius} onChange={(event) => setForm({ ...form, radius: event.target.value })} />
          <button className="primary-button" type="submit"><Save size={18} />Kaydet</button>
          <button className="secondary-button" type="button" onClick={() => { setForm(emptyForm); setEditingId(null); }}><X size={18} />İptal</button>
          <div className="rounded-2xl border border-dexa-blue/20 bg-dexa-blue/10 p-4 text-sm text-dexa-muted">
            <MapPinned className="mb-3 text-dexa-cyan" />
            Koordinat güncellemesi kaydedildiğinde kurye mesafe kontrolü yeni değerle hesaplanır.
          </div>
        </form>
      </div>
    </div>
  );
}
