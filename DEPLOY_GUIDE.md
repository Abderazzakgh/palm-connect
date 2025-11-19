# دليل النشر الكامل - Supabase Edge Functions

## 📋 الخطوات المطلوبة

### 1. التحقق من Supabase CLI

تأكد من تثبيت Supabase CLI:

```bash
# تثبيت Supabase CLI (إذا لم يكن مثبتاً)
npm install -g supabase

# أو باستخدام Homebrew (Mac)
brew install supabase/tap/supabase

# التحقق من التثبيت
supabase --version
```

### 2. تسجيل الدخول إلى Supabase

```bash
supabase login
```

سيطلب منك فتح المتصفح وتسجيل الدخول.

### 3. ربط المشروع

```bash
# ربط المشروع الحالي (project_id موجود في supabase/config.toml)
supabase link --project-ref qxtdcqwhqfuhlhwoffem
```

### 4. تطبيق Migrations

#### الطريقة الأولى: باستخدام CLI
```bash
# تطبيق جميع migrations
supabase db push
```

#### الطريقة الثانية: من Supabase Dashboard
1. اذهب إلى [Supabase Dashboard](https://supabase.com/dashboard)
2. اختر مشروعك
3. اذهب إلى **SQL Editor**
4. قم بتشغيل الملفات بالترتيب:
   - `supabase/migrations/20251106030000_create_handshakes_table.sql`
   - `supabase/migrations/20251106040000_setup_rls_policies.sql`

### 5. نشر Edge Functions

```bash
# نشر handshake function
supabase functions deploy handshake

# نشر vein-upload function
supabase functions deploy vein-upload

# نشر vein-secure-upload function
supabase functions deploy vein-secure-upload
```

### 6. التحقق من النشر

بعد النشر، يمكنك التحقق من أن Functions تعمل:

```bash
# اختبار handshake
curl -X GET https://qxtdcqwhqfuhlhwoffem.supabase.co/functions/v1/handshake \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## 🔐 إعداد متغيرات البيئة

### للـ Edge Functions

Edge Functions تحتاج إلى متغيرات البيئة التالية (يتم تعيينها تلقائياً):
- `SUPABASE_URL` - يتم تعيينه تلقائياً
- `SUPABASE_SERVICE_ROLE_KEY` - يتم تعيينه تلقائياً

### للتطبيق (Frontend)

تأكد من وجود ملف `.env` في المجلد الرئيسي:

```env
VITE_SUPABASE_URL=https://qxtdcqwhqfuhlhwoffem.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
```

للحصول على `anon key`:
1. اذهب إلى Supabase Dashboard
2. Settings → API
3. انسخ `anon` `public` key

## 🧪 الاختبار

### 1. اختبار Handshake

```bash
curl -X GET https://qxtdcqwhqfuhlhwoffem.supabase.co/functions/v1/handshake \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

يجب أن تحصل على رد يحتوي على:
- `publicKey`
- `salt`
- `keyId`
- `expires`

### 2. اختبار التطبيق

1. شغّل التطبيق:
   ```bash
   npm run dev
   ```

2. اذهب إلى صفحة Complete Profile
3. التقط صورة واختبر الرفع

### 3. التحقق من قاعدة البيانات

في Supabase Dashboard → Table Editor:
- تحقق من وجود بيانات في `handshakes`
- تحقق من وجود بيانات في `palm_vein_data`
- تحقق من وجود مفتاح في `server_keys`

## 🔍 استكشاف الأخطاء

### مشكلة: Edge Function لا تعمل

1. تحقق من Logs:
   ```bash
   supabase functions logs handshake
   ```

2. أو من Dashboard:
   - Edge Functions → handshake → Logs

### مشكلة: RLS Policy يمنع الوصول

1. تحقق من Policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'handshakes';
   ```

2. تأكد من تطبيق migration RLS:
   ```bash
   supabase db push
   ```

### مشكلة: CORS errors

Edge Functions تحتوي على CORS headers افتراضية. إذا واجهت مشاكل:
- تحقق من أن `Authorization` header موجود
- تحقق من أن URL صحيح

## 📝 ملاحظات إضافية

### الأمان

1. **المفتاح الخاص**: حالياً يتم تخزينه في قاعدة البيانات. للإنتاج:
   - استخدم Supabase Secrets
   - أو قم بتشفيره بمفتاح رئيسي

2. **RLS Policies**: تم إعدادها للسماح بـ service_role فقط للجداول الحساسة

### الأداء

- Edge Functions تعمل على Deno
- تأكد من أن الكود محسّن
- استخدم connection pooling عند الحاجة

## 🚀 الخطوات التالية

بعد النشر الناجح:

1. ✅ اختبار جميع Edge Functions
2. ✅ التحقق من RLS Policies
3. ✅ اختبار التطبيق بالكامل
4. ⚠️ إعداد Algorithm Service (إن وجد)
5. ⚠️ تحسين الأمان (تشفير المفتاح الخاص)

---

**نصيحة**: احتفظ بنسخة احتياطية من قاعدة البيانات قبل تطبيق migrations في الإنتاج!

