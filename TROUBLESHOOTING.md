# 🔧 حل مشكلة "Failed to fetch"

## المشكلة
عند الضغط على "إرسال آمن (ECDH)" أو "إرسال إلى الخادم"، تظهر رسالة خطأ:
- "خطأ بالإرسال"
- "Failed to fetch"

## الأسباب المحتملة والحلول

### 1. ✅ Edge Functions غير منشورة

**التحقق:**
- اذهب إلى Supabase Dashboard → Edge Functions
- يجب أن ترى 3 functions: `handshake`, `vein-upload`, `vein-secure-upload`

**الحل:**
1. **Edge Functions** → **Create a new function**
2. لكل function:
   - الاسم: `handshake` (أو `vein-upload` أو `vein-secure-upload`)
   - انسخ الكود من `supabase/functions/[الاسم]/index.ts`
   - **Deploy**

---

### 2. ✅ ملف `.env` غير موجود أو غير صحيح

**التحقق:**
- تأكد من وجود ملف `.env` في المجلد الرئيسي
- تأكد من وجود المتغيرات:

```env
VITE_SUPABASE_URL=https://qxtdcqwhqfuhlhwoffem.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
```

**الحل:**
1. أنشئ ملف `.env` في المجلد الرئيسي
2. أضف المتغيرات أعلاه
3. احصل على `anon key` من: Settings → API → `anon` `public` key
4. **أعد تشغيل التطبيق:**
   ```bash
   # أوقف التطبيق (Ctrl+C)
   npm run dev
   ```

---

### 3. ✅ URL غير صحيح

**التحقق:**
- افتح Console في المتصفح (F12)
- ابحث عن أخطاء في Network tab
- تحقق من URL في الطلبات

**الحل:**
- تأكد من أن `VITE_SUPABASE_URL` صحيح
- يجب أن يكون: `https://qxtdcqwhqfuhlhwoffem.supabase.co`
- **لا** يجب أن ينتهي بـ `/`

---

### 4. ✅ Migrations غير مطبقة

**التحقق:**
- Supabase Dashboard → Table Editor
- يجب أن ترى الجداول: `handshakes`, `palm_vein_data`, `server_keys`

**الحل:**
1. SQL Editor → New Query
2. انسخ محتوى `supabase/APPLY_ALL_MIGRATIONS.sql`
3. الصقه و Run

---

### 5. ✅ Storage Buckets غير موجودة

**التحقق:**
- Supabase Dashboard → Storage → Buckets
- يجب أن ترى: `encrypted_palm_data`, `palm_scans`

**الحل:**
- قم بتشغيل migration: `supabase/migrations/20251106060000_setup_storage.sql`

---

## 🔍 خطوات التشخيص

### الخطوة 1: فتح Console
1. اضغط F12 في المتصفح
2. اذهب إلى **Console** tab
3. ابحث عن أخطاء حمراء

### الخطوة 2: فتح Network Tab
1. في Developer Tools → **Network** tab
2. حاول إرسال البيانات مرة أخرى
3. ابحث عن الطلب الفاشل (باللون الأحمر)
4. اضغط عليه لرؤية التفاصيل:
   - **Status Code** (404 = Function غير موجود)
   - **Request URL** (تحقق من أنه صحيح)
   - **Response** (راجع رسالة الخطأ)

### الخطوة 3: التحقق من Edge Functions Logs
1. Supabase Dashboard → Edge Functions
2. اختر function (مثلاً `handshake`)
3. اضغط **Logs**
4. ابحث عن أخطاء

---

## ✅ اختبار سريع

### اختبار Handshake من المتصفح:

افتح Console في المتصفح (F12) والصق:

```javascript
const supabaseUrl = 'https://qxtdcqwhqfuhlhwoffem.supabase.co';
const anonKey = 'YOUR_ANON_KEY'; // استبدل بمفتاحك

fetch(`${supabaseUrl}/functions/v1/handshake`, {
  headers: {
    'Authorization': `Bearer ${anonKey}`,
  },
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

**إذا نجح:**
- يجب أن ترى `{ publicKey: "...", salt: "...", keyId: "..." }`
- Edge Function يعمل ✅

**إذا فشل:**
- تحقق من أن Function منشورة
- تحقق من أن URL صحيح
- تحقق من أن anon key صحيح

---

## 🎯 الحل السريع (Checklist)

- [ ] Edge Functions منشورة (3 functions)
- [ ] ملف `.env` موجود ويحتوي على المتغيرات الصحيحة
- [ ] تم إعادة تشغيل التطبيق بعد إضافة `.env`
- [ ] Migrations مطبقة (الجداول موجودة)
- [ ] Storage Buckets موجودة
- [ ] URL صحيح (لا ينتهي بـ `/`)
- [ ] anon key صحيح

---

## 📞 إذا استمرت المشكلة

1. **تحقق من Logs:**
   - Supabase Dashboard → Edge Functions → Logs
   - ابحث عن أخطاء

2. **تحقق من Console:**
   - F12 → Console
   - ابحث عن أخطاء JavaScript

3. **تحقق من Network:**
   - F12 → Network
   - ابحث عن الطلبات الفاشلة

4. **أعد نشر Edge Functions:**
   - احذف Function القديمة
   - أنشئ واحدة جديدة
   - انسخ الكود من جديد

---

**💡 نصيحة:** في معظم الحالات، المشكلة تكون بسبب Edge Functions غير منشورة أو ملف `.env` غير موجود!

