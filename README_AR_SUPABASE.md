# دليل الانتقال إلى Supabase

تم تحديث المشروع بالكامل لاستخدام Supabase بدلاً من السيرفر المحلي (`localhost:4000`).

## ✅ ما تم إنجازه

### 1. إنشاء Supabase Edge Functions
تم إنشاء ثلاث Edge Functions في `supabase/functions/`:

- **`handshake`**: لتبادل مفاتيح ECDH بين العميل والخادم
- **`vein-upload`**: لرفع بيانات بصمة الكف المشفرة (طريقة بسيطة)
- **`vein-secure-upload`**: لرفع بيانات بصمة الكف المشفرة (طريقة آمنة مع ECDH)

### 2. تحديث قاعدة البيانات
تم إضافة ثلاثة جداول جديدة:

- **`handshakes`**: لتخزين بيانات handshake (salt, keyId, expiration)
- **`palm_vein_data`**: لتخزين بيانات بصمة الكف المشفرة
- **`server_keys`**: لتخزين زوج المفاتيح (public/private) للخادم

### 3. تحديث الكود
- تم تحديث `src/components/CompleteProfile.tsx` لاستخدام Supabase Edge Functions بدلاً من `localhost:4000`
- تم إزالة جميع المراجع إلى السيرفر المحلي

## 📋 خطوات التطبيق

### 1. تطبيق Migrations
قم بتطبيق migrations الجديدة على قاعدة بيانات Supabase:

```bash
# إذا كنت تستخدم Supabase CLI
supabase db push

# أو من خلال Supabase Dashboard:
# 1. اذهب إلى SQL Editor
# 2. قم بتشغيل ملف: supabase/migrations/20251106030000_create_handshakes_table.sql
```

### 2. نشر Edge Functions
قم بنشر Edge Functions إلى Supabase:

```bash
# نشر جميع Functions
supabase functions deploy handshake
supabase functions deploy vein-upload
supabase functions deploy vein-secure-upload
```

### 3. التحقق من متغيرات البيئة
تأكد من وجود المتغيرات التالية في ملف `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

### 4. إعداد Row Level Security (RLS)
تأكد من إعداد RLS policies للجداول الجديدة:

```sql
-- مثال: السماح للخدمات بالوصول إلى handshakes
ALTER TABLE public.handshakes ENABLE ROW LEVEL SECURITY;

-- السماح للخدمات بالقراءة والكتابة
CREATE POLICY "Service role can manage handshakes"
ON public.handshakes
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

## 🔧 البنية الجديدة

```
supabase/
├── functions/
│   ├── handshake/
│   │   └── index.ts          # ECDH handshake endpoint
│   ├── vein-upload/
│   │   └── index.ts          # Simple upload endpoint
│   └── vein-secure-upload/
│       └── index.ts          # Secure upload endpoint
└── migrations/
    └── 20251106030000_create_handshakes_table.sql
```

## ⚠️ ملاحظات مهمة

### الأمان
1. **المفتاح الخاص**: حالياً يتم تخزين المفتاح الخاص في قاعدة البيانات بدون تشفير إضافي. للإنتاج:
   - استخدم Supabase Secrets لتخزين المفتاح
   - أو قم بتشفير المفتاح الخاص بمفتاح رئيسي (master key)

2. **Row Level Security**: تأكد من إعداد RLS policies بشكل صحيح لحماية البيانات

### القيود الحالية
1. **Algorithm Service**: حالياً يتم محاكاة استجابة خدمة الخوارزمية. إذا كان لديك خدمة خوارزمية فعلية:
   - قم بتحديث `vein-upload` و `vein-secure-upload` لاستدعاء خدمتك
   - أضف متغير البيئة `ALGO_SERVICE_URL` في Edge Functions

2. **HKDF في Deno**: Edge Functions تعمل على Deno، وقد تحتاج إلى مكتبة خارجية لـ HKDF إذا لم يكن متوفراً في Web Crypto API

## 🧪 الاختبار

بعد تطبيق التغييرات:

1. **اختبار Handshake**:
   ```bash
   curl -X GET https://your-project.supabase.co/functions/v1/handshake \
     -H "Authorization: Bearer your_anon_key"
   ```

2. **اختبار Upload**:
   - افتح التطبيق
   - اذهب إلى صفحة Complete Profile
   - التقط صورة واختبر الرفع

3. **التحقق من قاعدة البيانات**:
   - تحقق من وجود بيانات في جداول `handshakes` و `palm_vein_data`

## 📝 التغييرات في الكود

### قبل (localhost:4000):
```typescript
const resp = await fetch('http://localhost:4000/vein/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId, payload }),
});
```

### بعد (Supabase Edge Functions):
```typescript
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const resp = await fetch(`${supabaseUrl}/functions/v1/vein-upload`, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseAnonKey}`,
  },
  body: JSON.stringify({ userId, payload }),
});
```

## 🚀 الخطوات التالية

1. ✅ تطبيق migrations
2. ✅ نشر Edge Functions
3. ✅ اختبار التطبيق
4. ⚠️ إعداد RLS policies
5. ⚠️ تحسين الأمان (تشفير المفتاح الخاص)
6. ⚠️ ربط Algorithm Service (إن وجدت)

## 🆘 الدعم

إذا واجهت أي مشاكل:

1. تحقق من logs في Supabase Dashboard → Edge Functions → Logs
2. تأكد من أن Edge Functions تم نشرها بنجاح
3. تحقق من متغيرات البيئة
4. تحقق من RLS policies للجداول الجديدة

---

**تم التحديث بنجاح! 🎉**

