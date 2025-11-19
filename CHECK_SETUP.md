# ✅ فحص سريع للإعداد

## خطوات التحقق السريعة

### 1. ✅ ملف `.env`

**افتح ملف `.env` في المجلد الرئيسي:**

```env
VITE_SUPABASE_URL=https://qxtdcqwhqfuhlhwoffem.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
```

**إذا لم يكن موجوداً:**
1. أنشئ ملف `.env` جديد
2. أضف المتغيرات أعلاه
3. احصل على `anon key` من Supabase Dashboard → Settings → API
4. **أعد تشغيل التطبيق**

---

### 2. ✅ Edge Functions

**في Supabase Dashboard:**
1. اذهب إلى **Edge Functions**
2. يجب أن ترى 3 functions:
   - ✅ `handshake`
   - ✅ `vein-upload`
   - ✅ `vein-secure-upload`

**إذا لم تكن موجودة:**
- راجع `INSTRUCTIONS_AR.md` - الخطوة 2

---

### 3. ✅ قاعدة البيانات

**في Supabase Dashboard:**
1. اذهب إلى **Table Editor**
2. يجب أن ترى:
   - ✅ `handshakes`
   - ✅ `palm_vein_data`
   - ✅ `server_keys`
   - ✅ `palm_prints`

**إذا لم تكن موجودة:**
- قم بتشغيل `supabase/APPLY_ALL_MIGRATIONS.sql`

---

### 4. ✅ Storage Buckets

**في Supabase Dashboard:**
1. اذهب إلى **Storage** → **Buckets**
2. يجب أن ترى:
   - ✅ `encrypted_palm_data`
   - ✅ `palm_scans`

**إذا لم تكن موجودة:**
- قم بتشغيل `supabase/migrations/20251106060000_setup_storage.sql`

---

## 🧪 اختبار سريع

### من Console المتصفح (F12):

```javascript
// استبدل YOUR_ANON_KEY بمفتاحك
const url = 'https://qxtdcqwhqfuhlhwoffem.supabase.co';
const key = 'YOUR_ANON_KEY';

fetch(`${url}/functions/v1/handshake`, {
  headers: { 'Authorization': `Bearer ${key}` }
})
.then(r => r.json())
.then(data => {
  console.log('✅ Handshake يعمل!', data);
})
.catch(err => {
  console.error('❌ خطأ:', err);
});
```

**إذا نجح:** Edge Functions تعمل ✅
**إذا فشل:** راجع `TROUBLESHOOTING.md`

---

## 🎯 الحل السريع

إذا رأيت "Failed to fetch":

1. **تحقق من `.env`** ← الأكثر شيوعاً!
2. **تحقق من Edge Functions** ← يجب أن تكون منشورة
3. **أعد تشغيل التطبيق** ← بعد تعديل `.env`

---

**💡 نصيحة:** في 90% من الحالات، المشكلة تكون بسبب ملف `.env` غير موجود أو Edge Functions غير منشورة!

