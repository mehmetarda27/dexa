import { Clock3, Edit3, Link2, Save, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import { useToast } from '../../components/common/ToastProvider';
import EmptyState from '../../components/common/EmptyState';
import { useOperations } from '../../state/OperationsContext';
import { todayISO, tomorrowISO } from '../../utils/dateTime';
import { validateAssignmentForm } from '../../utils/validation';

export default function Assignments() {
  const { couriers, restaurants, assignments, addAssignment, addBulkAssignments, updateAssignment, cancelAssignment } = useOperations();
  const { notify } = useToast();
  const [form, setForm] = useState({
    courierId: couriers[0]?.id || '',
    restaurantId: restaurants[0]?.id || '',
    date: tomorrowISO(),
    startTime: '10:00',
    endTime: '18:00',
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    setForm((current) => ({
      ...current,
      courierId: current.courierId || couriers[0]?.id || '',
      restaurantId: current.restaurantId || restaurants[0]?.id || '',
    }));
  }, [couriers, restaurants]);

  const submit = async (event) => {
    event.preventDefault();
    const errors = validateAssignmentForm(form);
    if (Object.keys(errors).length) {
      notify({ type: 'error', title: 'Eksik bilgi', message: Object.values(errors)[0] });
      return;
    }
    try {
      if (editingId) {
        await updateAssignment(editingId, form);
        notify({ title: 'Vardiya güncellendi', message: `${form.date} · ${form.startTime} - ${form.endTime}` });
        setEditingId(null);
      } else {
        await addAssignment(form);
        notify({ title: 'Vardiya oluşturuldu', message: `${form.date} · ${form.startTime} - ${form.endTime}` });
      }
    } catch (error) {
      notify({ type: 'error', title: 'Vardiya oluşturulamadı', message: error.message });
    }
  };

  const bulkCreateTomorrow = async () => {
    if (!couriers.some((courier) => courier.active) || !restaurants.length) {
      notify({ type: 'error', title: 'Toplu vardiya oluÅŸturulamadÄ±', message: 'Aktif kurye ve restoran kaydÄ± gerekir.' });
      return;
    }

    try {
      await addBulkAssignments(
        couriers.filter((courier) => courier.active).map((courier, index) => ({
          courierId: courier.id,
          restaurantId: restaurants[index % restaurants.length].id,
          date: tomorrowISO(),
          startTime: '10:00',
          endTime: '18:00',
        })),
      );
      notify({ title: 'Toplu vardiya oluşturuldu', message: 'Aktif kuryeler için yarınki plan hazırlandı.' });
    } catch (error) {
      notify({ type: 'error', title: 'Çakışan vardiya', message: error.message });
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Atama merkezi"
        title="Kurye restoran atama ve vardiya oluşturma"
        description="Kuryeler restoranlara bağlanır, vardiya saatleri ve menzil koşulları bu ekranda hazırlanır."
        action={<button className="secondary-button" type="button" onClick={bulkCreateTomorrow}>Toplu vardiya oluştur</button>}
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <form className="glass-panel grid gap-4 p-5" onSubmit={submit}>
          <h2 className="text-xl font-bold text-white">{editingId ? 'Vardiya düzenle' : 'Yeni atama'}</h2>
          <select className="field" value={form.courierId} onChange={(event) => setForm({ ...form, courierId: event.target.value })}>
            <option value="">Kurye seç</option>
            {couriers.map((courier) => <option key={courier.id} value={courier.id}>{courier.fullName}</option>)}
          </select>
          <select className="field" value={form.restaurantId} onChange={(event) => setForm({ ...form, restaurantId: event.target.value })}>
            {restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}
          </select>
          <input className="field" type="date" value={form.date} min={todayISO()} onChange={(event) => setForm({ ...form, date: event.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className="field" type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} />
            <input className="field" type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} />
          </div>
          <button className="primary-button" type="submit"><Save size={18} />Kaydet</button>
        </form>
        <section className="glass-panel rounded-3xl p-5">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Mevcut atamalar</h2>
            <Link2 className="text-dexa-cyan" />
          </div>
          {assignments.length ? <div className="grid gap-3">
            {assignments.map((assignment) => {
              const courier = couriers.find((item) => item.id === assignment.courierId);
              const restaurant = restaurants.find((item) => item.id === assignment.restaurantId);
              return (
                <article key={assignment.id} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <strong className="text-white">{courier?.fullName}</strong>
                    <p className="mt-1 text-sm text-dexa-muted">{restaurant?.name} · {assignment.date}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Clock3 size={16} className="text-dexa-cyan" />
                    <span className="text-sm font-semibold text-white">{assignment.startTime} - {assignment.endTime}</span>
                    <StatusBadge>{assignment.status === 'cancelled' ? 'Reddedildi' : assignment.date === todayISO() ? 'Aktif' : 'Onay Bekliyor'}</StatusBadge>
                    <button className="secondary-button min-h-9 px-3" type="button" onClick={() => { setEditingId(assignment.id); setForm({ courierId: assignment.courierId, restaurantId: assignment.restaurantId, date: assignment.date, startTime: assignment.startTime, endTime: assignment.endTime }); }}><Edit3 size={15} />Düzenle</button>
                    <button className="secondary-button min-h-9 px-3" type="button" onClick={() => { cancelAssignment(assignment.id); notify({ title: 'Vardiya iptal edildi', message: courier?.fullName }); }}><XCircle size={15} />İptal</button>
                  </div>
                </article>
              );
            })}
          </div> : <EmptyState title="Henüz vardiya oluşturulmadı" description="Kurye ve restoran seçilerek planlanan vardiyalar burada listelenir." />}
        </section>
      </div>
    </div>
  );
}
