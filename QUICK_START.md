# 🚀 دليل البدء السريع - تطبيق Migrations ونشر Edge Functions

## الطريقة السريعة (بدون CLI)

### الخطوة 1: تطبيق Migrations من Supabase Dashboard

1. **افتح Supabase Dashboard:**
   - اذهب إلى: https://supabase.com/dashboard
   - سجل الدخول واختر مشروعك (qxtdcqwhqfuhlhwoffem)

2. **افتح SQL Editor:**
   - من القائمة الجانبية: **SQL Editor** → **New Query**

3. **انسخ والصق الكود:**
   - افتح ملف: `supabase/APPLY_ALL_MIGRATIONS.sql`
   - انسخ المحتوى بالكامل
   - الصقه في SQL Editor

4. **شغّل الكود:**
   - اضغط على **Run** أو `Ctrl+Enter`
   - يجب أن ترى رسالة نجاح ✅

### الخطوة 2: نشر Edge Functions

#### الطريقة الأولى: من Supabase Dashboard

1. **افتح Edge Functions:**
   - من القائمة: **Edge Functions**

2. **أنشئ Function جديدة:**
   - اضغط **Create a new function**
   - لكل function:
     - **handshake**: انسخ محتوى `supabase/functions/handshake/index.ts`
     - **vein-upload**: انسخ محتوى `supabase/functions/vein-upload/index.ts`
     - **vein-secure-upload**: انسخ محتوى `supabase/functions/vein-secure-upload/index.ts`

#### الطريقة الثانية: استخدام Supabase CLI (إذا كان مثبتاً)

إذا كان لديك Supabase CLI مثبت (عبر Scoop أو طريقة أخرى):

```bash
# تسجيل الدخول
supabase login

# ربط المشروع
supabase link --project-ref qxtdcqwhqfuhlhwoffem

# نشر Functions
supabase functions deploy handshake
supabase functions deploy vein-upload
supabase functions deploy vein-secure-upload
```

### الخطوة 3: التحقق من النجاح

1. **تحقق من الجداول:**
   - Table Editor → يجب أن ترى: `handshakes`, `palm_vein_data`, `server_keys`

2. **تحقق من Edge Functions:**
   - Edge Functions → يجب أن ترى 3 functions

3. **اختبار Handshake:**
   ```bash
   # احصل على anon key من Settings → API
   curl -X GET https://qxtdcqwhqfuhlhwoffem.supabase.co/functions/v1/handshake \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

## تثبيت Supabase CLI (اختياري)

إذا أردت استخدام CLI بدلاً من Dashboard:

### Windows (Scoop):
```powershell
# تثبيت Scoop (إذا لم يكن مثبتاً)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# تثبيت Supabase CLI
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Windows (Direct Download):
1. اذهب إلى: https://github.com/supabase/cli/releases
2. حمّل `supabase_windows_amd64.zip`
3. استخرج الملف
4. أضف المسار إلى PATH

### Mac (Homebrew):
```bash
brew install supabase/tap/supabase
```

### Linux:
```bash
# باستخدام npm (local)
npm install supabase --save-dev

# أو باستخدام npx
npx supabase --version
```

## التحقق من الإعداد

بعد تطبيق كل شيء:

1. **شغّل التطبيق:**
   ```bash
   npm run dev
   ```

2. **اختبر Complete Profile:**
   - اذهب إلى صفحة Complete Profile
   - التقط صورة
   - جرب رفع البيانات

3. **تحقق من Logs:**
   - Supabase Dashboard → Edge Functions → Logs
   - يجب أن ترى طلبات ناجحة

## 🆘 حل المشاكل

### مشكلة: "relation does not exist"
- تأكد من تطبيق migrations بنجاح
- تحقق من أن الجداول موجودة في Table Editor

### مشكلة: "permission denied"
- تحقق من RLS Policies
- تأكد من تطبيق migration RLS

### مشكلة: Edge Function لا تعمل
- تحقق من Logs في Dashboard
- تأكد من أن Function منشورة
- تحقق من Authorization header

---

**💡 نصيحة:** استخدم Supabase Dashboard إذا كان CLI معقداً. كل شيء يمكن عمله من الواجهة!

