# Dexa

Dexa, kurye vardiya, restoran atama, mesai, GPS doğrulama, bildirim ve kazanç yönetimi için hazırlanmış React + Firebase tabanlı operasyon panelidir.

Bu repo yayına hazır olacak şekilde yapılandırılmıştır. Firebase projesini oluşturup config bilgilerini `.env` veya Vercel Environment Variables alanına girmeniz yeterlidir.

## Hızlı Kurulum

```bash
npm install
cp .env.example .env
npm run dev
```

Windows PowerShell kullanıyorsanız:

```powershell
Copy-Item .env.example .env
npm run dev
```

## Environment Variables

`.env.example` içindeki alanları Firebase ve şirket bilgilerinize göre doldurun:

```env
VITE_APP_NAME=Dexa
VITE_APP_ENV=production

VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=

VITE_ENABLE_PWA=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_GPS=true

VITE_SHIFT_RADIUS_METERS=100
VITE_LOCATION_ACCURACY_LIMIT=50
VITE_HOURLY_RATE=225

VITE_SUPPORT_EMAIL=
VITE_COMPANY_NAME=Dexa
```

Uygulama env doğrulaması yapar. Firebase bilgileri eksikse uygulama crash vermez; giriş ekranında kullanıcı dostu bir uyarı gösterir.

## Firebase Kurulumu

1. [Firebase Console](https://console.firebase.google.com/) üzerinden yeni proje oluşturun.
2. Project Settings > General > Your apps bölümünden Web App ekleyin.
3. Firebase SDK config içindeki değerleri alın.
4. Bu değerleri `.env` dosyasındaki şu alanlara yapıştırın:

- `apiKey` -> `VITE_FIREBASE_API_KEY`
- `authDomain` -> `VITE_FIREBASE_AUTH_DOMAIN`
- `projectId` -> `VITE_FIREBASE_PROJECT_ID`
- `storageBucket` -> `VITE_FIREBASE_STORAGE_BUCKET`
- `messagingSenderId` -> `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `appId` -> `VITE_FIREBASE_APP_ID`
- `measurementId` -> `VITE_FIREBASE_MEASUREMENT_ID`

## Firebase Auth

1. Firebase Console > Authentication > Get started seçin.
2. Sign-in method sekmesine gidin.
3. Email/Password providerını aktif edin.
4. Admin ve kurye kullanıcılarını Firebase Auth içinde oluşturun.
5. Firestore `users` koleksiyonunda Auth UID ile eşleşen kullanıcı dokümanı oluşturun.

Login ekranında kullanıcı adı istenir, ancak Firebase Auth email/password kullandığı için uygulama arka planda email mapping yapar:

- `admin` kullanıcı adı `admin@dexa.com` adresine çevrilir.
- Kurye kullanıcı adları `kullaniciadi@dexa.com` formatına çevrilir.

Geçici başlangıç admin hesabı:

- username: `admin`
- email: `admin@dexa.com`
- password: `admin123`

Örnek `users/{uid}` dokümanı:

```json
{
  "username": "admin",
  "email": "admin@dexa.com",
  "role": "admin",
  "active": true
}
```

Kurye kullanıcısı için ayrıca `couriers` koleksiyonunda `uid` alanı Auth UID ile eşleşmelidir.

## Firestore Database

1. Firebase Console > Firestore Database > Create database seçin.
2. Production mode ile başlatın.
3. Lokasyon olarak uygulamaya en yakın bölgeyi seçin.
4. Aşağıdaki ana koleksiyonlar uygulama tarafından kullanılır:

- `users`
- `couriers`
- `restaurants`
- `assignments`
- `shifts`
- `breaks`
- `earnings`
- `reports`
- `announcements`
- `notifications`
- `auditLogs`
- `offlineQueue`

## Firestore Rules ve Index Yayınlama

Projede hazır güvenlik kuralları ve index dosyaları vardır:

- `firestore.rules`
- `firestore.indexes.json`

Firebase CLI ile yayınlamak için:

```bash
npm install -g firebase-tools
firebase login
firebase use YOUR_FIREBASE_PROJECT_ID
firebase deploy --only firestore:rules,firestore:indexes
```

Kurallar rol bazlıdır:

- Kurye sadece kendi verilerini ve kendi bildirimlerini okuyabilir.
- Admin operasyon verilerini yönetebilir.
- Super admin admin kullanıcı yönetimi yapabilir.
- Bildirimler `notifications` koleksiyonunda kullanıcı bazlı tutulur.

## Vercel Yayınlama

Vercel tarafında yapılacaklar:

1. Vercel Dashboard > Add New Project ile repoyu bağlayın.
2. Project Settings > Environment Variables bölümünü açın.
3. `.env.example` içindeki tüm `VITE_` değişkenlerini tek tek ekleyin.
4. Firebase Console’dan aldığınız config değerlerini ilgili alanlara girin.
5. Build ayarları:

- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

`vercel.json` SPA routing için hazırdır. `/admin/...` ve `/courier/...` gibi route’lar yenilendiğinde `index.html` fallback ile açılır.

## Production Build

Yerelde production build almak için:

```bash
npm install
npm run build
```

Başarılı build sonrası çıktı `dist` klasörüne üretilir.

## PWA, GPS ve Bildirimler

- `VITE_ENABLE_PWA=true` ise production build’de service worker kayıt edilir.
- `VITE_ENABLE_NOTIFICATIONS=true` ise bildirim merkezi ve tarayıcı izin akışı aktif olur.
- `VITE_ENABLE_GPS=true` ise kurye mesai işlemlerinde mobil tarayıcı GPS kontrolü çalışır.
- Mobil GPS için production ortamında HTTPS gerekir. Vercel bunu otomatik sağlar.

## Yayına Alma Kontrol Listesi

- Firebase Web App config değerleri alındı.
- Vercel Environment Variables alanları dolduruldu.
- Firebase Auth Email/Password aktif edildi.
- Firestore Database production mode ile oluşturuldu.
- `firestore.rules` ve `firestore.indexes.json` publish edildi.
- Admin kullanıcı Auth ve Firestore `users` dokümanı ile oluşturuldu.
- `npm run build` hatasız geçti.
- Vercel deploy tamamlandı.

## Güvenlik Notları

- Şifreler Firestore içinde tutulmaz; Firebase Auth kullanılır.
- Firestore rules yayına alınmadan production veri girişi yapmayın.
- `.env` dosyasını repoya commit etmeyin.
- Vercel Environment Variables değerlerini Production ortamına eklediğinizden emin olun.
