 HEAD
# BIS Hub

```bash
npm install
npm run dev
```

- `src/data/mock.js` — بيانات تجريبية (نفس أسماء أعمدة الـ schema)
- `src/services/api.js` — الصفحات بتنادي هنا بس؛ استبدل الـ mock بـ Supabase لاحقًا
- `src/pages/Login.jsx` — Placeholder لتسجيل دخول الأدمن

## Supabase
1. أنشئ مشروع على supabase.com
2. شغّل `supabase/schema.sql` في SQL Editor
3. انسخ `.env.example` إلى `.env` وحط الـ URL والـ anon key
4. سجّل حساب مرة واحدة، ثم نفّذ سطر الـ promote اللي في آخر الـ schema لتصبح أدمن

## Admin
أنشئ مستخدم من Supabase > Authentication > Users > Add user (Auto Confirm)، ثم نفّذ سطر الـ promote، ثم ادخل من /#/admin.
=======
# bis-hup
 a58d2bc6504834b4888f4ca20debb9a43b63f01e
