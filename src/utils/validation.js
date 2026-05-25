export function required(value) {
  return String(value || '').trim().length > 0;
}

export function validateLogin({ username, password }) {
  const errors = {};
  if (!required(username)) errors.username = 'Kullanıcı adı zorunludur.';
  if (!required(password)) errors.password = 'Şifre zorunludur.';
  return errors;
}

export function validateCourierForm(values) {
  const errors = {};
  if (!required(values.fullName)) errors.fullName = 'Ad soyad zorunludur.';
  if (!required(values.username)) errors.username = 'Kullanıcı adı zorunludur.';
  if (!required(values.phone)) errors.phone = 'Telefon zorunludur.';
  return errors;
}

export function validateRestaurantForm(values) {
  const errors = {};
  if (!required(values.name)) errors.name = 'Restoran adı zorunludur.';
  if (!Number.isFinite(Number(values.lat))) errors.lat = 'Geçerli latitude girin.';
  if (!Number.isFinite(Number(values.lng))) errors.lng = 'Geçerli longitude girin.';
  if (!Number.isFinite(Number(values.radius || 100))) errors.radius = 'Geçerli menzil girin.';
  return errors;
}

export function validateAssignmentForm(values) {
  const errors = {};
  if (!required(values.courierId)) errors.courierId = 'Kurye seçimi zorunludur.';
  if (!required(values.restaurantId)) errors.restaurantId = 'Restoran seçimi zorunludur.';
  if (!required(values.date)) errors.date = 'Vardiya tarihi zorunludur.';
  if (!required(values.startTime)) errors.startTime = 'Başlangıç saati zorunludur.';
  if (!required(values.endTime)) errors.endTime = 'Bitiş saati zorunludur.';
  return errors;
}

export function assertNoValidationErrors(errors) {
  const first = Object.values(errors)[0];
  if (first) throw new Error(first);
}
