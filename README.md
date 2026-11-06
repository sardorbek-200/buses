# BusTicket

Avtobus chiptalarini qidirish, joy tanlash, bron qilish va QR-chipta olish uchun Next.js 15 loyihasi. Frontend, REST API va Socket.IO bitta Node.js/Next.js servisida ishlaydi; ma'lumotlar MongoDB replica set'da saqlanadi.

## Texnologiyalar

- Next.js 15 App Router, React 19, JavaScript
- Next.js Route Handlers: `/api/v1/...`
- MongoDB + Mongoose; parallel bronlarni himoyalovchi unique `tripId + seatNumber` indeksi
- JWT access/refresh cookie, bcrypt parol, OTP (demo), rol tekshiruvi
- Socket.IO o'rindiq holatini yangilaydi; cron bron muddatini va reys holatlarini kuzatadi
- PM2 va Nginx reverse proxy uchun deploy konfiguratsiyalari

## Lokal ishga tushirish

Talablar: Node.js 20+, npm va MongoDB replica set. Bir nechta o'rindiqni bron qilish atomic transaction ichida bajariladi, shuning uchun MongoDB replica set shart.

```powershell
Copy-Item .env.example .env
npm install
npm run seed
npm run dev
```

`.env` faylida `MONGODB_URI`, JWT secret'lari va `QR_HMAC_SECRET` qiymatlarini belgilang. Secret'lar kamida 32 belgidan iborat bo'lishi kerak. Mahalliy MongoDB replica set yoki MongoDB Atlas replica set ishlating.

Lokal demo OTP kodi: `1111`. Demo akkauntlar (`npm run seed`):

- Admin: `+998900000001` / `Admin123!demo`
- Operator: `+998900000002` / `Operator123!demo`

Bu hisoblar faqat demo muhit uchun. Ishlab chiqarishda o'z parollaringizni `SEED_ADMIN_PASSWORD` va `SEED_OPERATOR_PASSWORD` orqali bering; demo parollar bilan seed qilmang.

## Asosiy oqim

1. Bosh sahifadan shahar/sana tanlab reys qidiring.
2. Reys sahifasida bo'sh o'rindiqlarni tanlang (ko'pi bilan 5), yo'lovchi ma'lumotlarini kiriting.
3. Bron 10 daqiqaga ushlab turiladi; test to'lovni tasdiqlagach, QR imzoli chipta hosil bo'ladi.
4. Profil bo'limida chiptalarni ko'ring yoki PDF formatida yuklab oling.
5. Controller QR skaneridan chiptani bir marta tekshiring.

## API

JSON javoblari `{ "success": true, "data": ... }` yoki `{ "success": false, "error": { "code": "...", "message": "..." } }` ko'rinishida.

- `POST /api/v1/auth/register`, `/verify-otp`, `/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password`, `GET /auth/me`
- `GET /api/v1/cities?search=...`
- `GET /api/v1/trips/search?from=...&to=...&date=YYYY-MM-DD&passengers=1`
- `GET /api/v1/trips/:id`, `GET /api/v1/trips/:id/seats`
- `POST /api/v1/bookings`, `GET /api/v1/bookings`, `GET /api/v1/bookings/:id`, `POST /api/v1/bookings/:id/cancel`
- `POST /api/v1/payments/:bookingId/init`, `POST /api/v1/payments/mock/:bookingId/confirm`
- `GET /api/v1/tickets/:id/pdf`, `POST /api/v1/tickets/verify`
- Operator: `GET/POST /api/v1/operator/{buses,routes,trips}`, `POST /operator/trips/:id/cancel`
- Admin: `GET /api/v1/admin/operators`, `POST /api/v1/admin/operators/:id/approve`, `POST /api/v1/admin/cities`
- `GET /api/v1/health`

Operator API'larida hozircha avtobus, marshrut va reys yaratish/listlash hamda reys bekor qilish mavjud; to'liq tahrirlash/o'chirish, manifest eksporti, takrorlanuvchi reyslar, komissiya sozlamasi va hisobot UI keyingi iteratsiyada bajarilishi kerak.

## To'lov va OTP cheklovlari

Test to'lov demo rejimida ishlaydi va takroriy tasdiq chiptalarni qayta yaratmaydi. Click/Payme hisoblari, merchant kalitlari va provayder webhook imzolarisiz haqiqiy to'lovni yoqib bo'lmaydi. `MOCK_PAYMENTS=true` test to'lov endpointini production'da ham ochadi — faqat demo serverda qoldiring, haqiqiy to'lov oldidan o'chiring. SMS provayderi ulanmagani sababli OTP ro'yxatdan o'tishi ishlab chiqarish muhitida xavfsiz tarzda `503 SMS_UNAVAILABLE` qaytaradi; SMS integratsiyasini qo'shmasdan production ro'yxatdan o'tishni ochmang.

## VPS va GitHub Actions CI/CD

Ilova `3009` portida faqat `127.0.0.1` ga bog'lanadi; tashqi trafik Nginx orqali keladi. `main` branch'ga push qilinganda GitHub Actions test, lint va production buildni bajaradi, so'ng serverda `git pull`, install/build va PM2/Nginx reload qiladi.

### VPS'ni birinchi marta tayyorlash (Ubuntu)

1. DNS `A` yozuvini `bases.sstudio.uz` uchun VPS IP'ga yo'naltiring; firewall'da faqat SSH, HTTP (80) va HTTPS (443) portlarini ochiq qoldiring. MongoDB Atlas replica set yoki alohida replica set tayyorlang.
2. Ubuntu serverda Node.js 22, Git, Nginx, Certbot va PM2 o'rnating:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git nginx certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

3. Repo ochiq bo'lsa, serverda klonlang yoki mavjud checkout'ni yangilang:

```bash
if [ -d /root/buses/.git ]; then
  git -C /root/buses pull --ff-only origin main
else
  git clone https://github.com/sardorbek-200/buses.git /root/buses
fi
cd /root/buses
[ -f .env ] || cp .env.example .env
nano .env
```

`.env` ichida `NODE_ENV=production`, `PORT=3009`, `SITE_URL=https://bases.sstudio.uz`, `MONGODB_URI` va JWT/QR uchun uchta alohida 32+ belgili secret kiriting (`openssl rand -base64 48` bilan yarating); `MOCK_PAYMENTS=false` bo'lsin. `.env` Git'ga kiritilmaydi va CI deploy vaqtida ustidan yozilmaydi.

4. Nginx virtual host'ni sozlang:

```bash
cp deploy/busticket.nginx.conf /etc/nginx/sites-available/busticket
ln -s /etc/nginx/sites-available/busticket /etc/nginx/sites-enabled/busticket
nginx -t && systemctl reload nginx
```

Certbot bilan HTTPS yoqing: `sudo certbot --nginx -d bases.sstudio.uz`.

5. Birinchi deploy'ni bajaring:

```bash
cd /root/buses
npm ci
npm test
npm run lint
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

`pm2 startup` chiqargan buyruqni ham bajarib qo'ying.

### GitHub Actions secrets

Repo `Settings → Secrets and variables → Actions` bo'limida quyidagi **Repository secrets** ni kiriting:

- `SSH_PRIVATE`: VPS'ga kirish uchun SSH private key (kalit matnini repoga yoki chatga qo'ymang).
- `SSH_HOST`: VPS IP yoki hostname.
- `SERVER_USER`: `/root/buses` uchun huquqi bor SSH foydalanuvchi (shu joylashuvda `root`).
- `SERVER_PORT`: SSH porti (odatda `22`; bu ilovaning `3009` porti emas).
- `SSH_KNOWN_HOSTS` (ixtiyoriy, tavsiya etiladi): server host key fingerprint'i; bo'sh bo'lsa runner `ssh-keyscan` ishlatadi.

Secrets kiritilmaguncha workflow test/lint/build'ni bajaradi va VPS deploy bosqichini ogohlantirish bilan o'tkazib yuboradi.

`.github/workflows/deploy.yml` `main` branch'ga push bo'lganda CI/CD'ni avtomatik ishga tushiradi. Deploy xatosi bo'lsa, GitHub Actions loglari va serverdagi `pm2 logs busticket` buyrug'ini tekshiring. Nginx konfiguratsiyasi `deploy/busticket.nginx.conf` faylida.

`deploy/deploy.sh` serverdan qo'lda `git pull`, build va reload qilish uchun. Production'da PM2 bitta instance ishlatadi, shuning uchun Socket.IO va cron takrorlanmaydi.

## Tekshirish

```powershell
npm test
npm run lint
npm run build
```

Build uchun MongoDB ishlashi shart emas. API va seed amallarini tekshirish uchun `.env` hamda replica set MongoDB ishlayotgan bo'lishi kerak.
