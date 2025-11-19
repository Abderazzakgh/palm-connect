# 📝 تعليمات التطبيق - خطوة بخطوة

## ✅ الخطوة 1: تطبيق Migrations (إلزامي)

### من Supabase Dashboard:

1. **افتح Supabase Dashboard:**
   - اذهب إلى: https://supabase.com/dashboard
   - سجل الدخول
   - اختر مشروعك: **qxtdcqwhqfuhlhwoffem**

2. **افتح SQL Editor:**
   - من القائمة الجانبية: اضغط على **SQL Editor**
   - اضغط **New Query**

3. **انسخ والصق:**
   - افتح ملف: `supabase/APPLY_ALL_MIGRATIONS.sql`
   - انسخ **جميع** المحتوى (Ctrl+A ثم Ctrl+C)
   - الصقه في SQL Editor (Ctrl+V)

4. **شغّل:**
   - اضغط **Run** (أو `Ctrl+Enter`)
   - انتظر حتى ترى رسالة نجاح ✅

5. **تحقق:**
   - اذهب إلى **Table Editor**
   - يجب أن ترى 3 جداول جديدة:
     - ✅ `handshakes`
     - ✅ `palm_vein_data`
     - ✅ `server_keys`

---

## ✅ الخطوة 2: نشر Edge Functions (إلزامي)

### من Supabase Dashboard:

1. **افتح Edge Functions:**
   - من القائمة: اضغط **Edge Functions**

2. **أنشئ Function: handshake**
   - اضغط **Create a new function**
   - الاسم: `handshake`
   - افتح ملف: `supabase/functions/handshake/index.ts`
   - انسخ **جميع** المحتوى والصقه
   - اضغط **Deploy**

3. **أنشئ Function: vein-upload**
   - اضغط **Create a new function**
   - الاسم: `vein-upload`
   - افتح ملف: `supabase/functions/vein-upload/index.ts`
   - انسخ **جميع** المحتوى والصقه
   - اضغط **Deploy**

4. **أنشئ Function: vein-secure-upload**
   - اضغط **Create a new function**
   - الاسم: `vein-secure-upload`
   - افتح ملف: `supabase/functions/vein-secure-upload/index.ts`
   - انسخ **جميع** المحتوى والصقه
   - اضغط **Deploy**

5. **تحقق:**
   - يجب أن ترى 3 functions في القائمة:
     - ✅ `handshake`
     - ✅ `vein-upload`
     - ✅ `vein-secure-upload`

---

## ✅ الخطوة 3: التحقق من متغيرات البيئة

1. **افتح ملف `.env`** في المجلد الرئيسي للمشروع

2. **تأكد من وجود:**
   ```env
   VITE_SUPABASE_URL=https://qxtdcqwhqfuhlhwoffem.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
   ```

3. **للحصول على anon key:**
   - في Supabase Dashboard
   - Settings → API
   - انسخ `anon` `public` key
   - الصقه في `.env`

---

## ✅ الخطوة 4: الاختبار

1. **شغّل التطبيق:**
   ```bash
   npm run dev
   ```

2. **اختبر:**
   - افتح المتصفح: http://localhost:5173
   - اذهب إلى صفحة **Complete Profile**
   - التقط صورة
   - جرب رفع البيانات

3. **تحقق من Logs:**
   - Supabase Dashboard → Edge Functions → اختر function → Logs
   - يجب أن ترى طلبات ناجحة

---

## 🎉 تم! 

إذا اتبعت جميع الخطوات، يجب أن يعمل التطبيق الآن مع Supabase!

---

## 🆘 إذا واجهت مشاكل:

### مشكلة: "relation does not exist"
- **الحل:** تأكد من تطبيق migrations بنجاح (الخطوة 1)

### مشكلة: "permission denied"
- **الحل:** تأكد من تطبيق migrations (يحتوي على RLS policies)

### مشكلة: Edge Function لا تعمل
- **الحل:** 
  - تحقق من Logs في Dashboard
  - تأكد من نسخ الكود بالكامل
  - تحقق من أن Function منشورة

### مشكلة: CORS errors
- **الحل:** 
  - تحقق من `Authorization` header في الكود
  - تأكد من أن URL صحيح

---

**💡 نصيحة:** إذا واجهت أي مشكلة، تحقق من Logs في Supabase Dashboard أولاً!

