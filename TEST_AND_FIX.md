# 🔧 اختبار وإصلاح المشكلة - خطوة بخطوة

## 🎯 الخطوة 1: اختبار Edge Functions

### طريقة 1: استخدام صفحة الاختبار

1. **افتح ملف `test-edge-functions.html`** في المتصفح
2. **املأ البيانات:**
   - URL: `https://wpephofbbvqmllmueumw.supabase.co`
   - Anon Key: (من ملف `.env`)
3. **اضغط "اختبار الكل"**
4. **راجع النتائج:**
   - ✅ إذا نجح: Functions موجودة
   - ❌ إذا فشل بـ 404: Functions غير منشورة

### طريقة 2: من Console المتصفح (F12)

افتح Console (F12) والصق:

```javascript
const url = 'https://wpephofbbvqmllmueumw.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwZXBob2ZiYnZxbWxsbXVldW13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NTUzNDksImV4cCI6MjA3ODMzMTM0OX0.4kFsfTkKoGcGkYF9v0_PBHpl69nN9E4ceXXsJTa3FGo';

// اختبار handshake
fetch(`${url}/functions/v1/handshake`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
  },
})
.then(r => {
  console.log('Status:', r.status);
  if (r.status === 404) {
    console.error('❌ Function غير موجود! يجب نشر Edge Functions');
  } else if (r.status === 200) {
    return r.json().then(data => {
      console.log('✅ نجح!', data);
    });
  } else {
    return r.text().then(text => {
      console.error('❌ خطأ:', r.status, text);
    });
  }
})
.catch(err => {
  console.error('❌ فشل الاتصال:', err.message);
});
```

---

## 🎯 الخطوة 2: نشر Edge Functions (إذا كانت غير موجودة)

### من Supabase Dashboard:

1. **افتح:** https://supabase.com/dashboard
2. **اختر مشروعك:** (URL: `wpephofbbvqmllmueumw`)
3. **Edge Functions** → **Create a new function**

### Function 1: handshake

1. **Name:** `handshake`
2. **Code:** 
   - افتح: `supabase/functions/handshake/index.ts`
   - انسخ **كل** المحتوى
   - الصقه في Code Editor
3. **Deploy**

### Function 2: vein-upload

1. **Name:** `vein-upload`
2. **Code:**
   - افتح: `supabase/functions/vein-upload/index.ts`
   - انسخ **كل** المحتوى
   - الصقه في Code Editor
3. **Deploy**

### Function 3: vein-secure-upload

1. **Name:** `vein-secure-upload`
2. **Code:**
   - افتح: `supabase/functions/vein-secure-upload/index.ts`
   - انسخ **كل** المحتوى
   - الصقه في Code Editor
3. **Deploy**

---

## 🎯 الخطوة 3: التحقق من `.env`

**افتح ملف `.env` وتأكد من:**

```env
VITE_SUPABASE_URL=https://wpephofbbvqmllmueumw.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**⚠️ مهم:**
- لا تضع علامات اقتباس حول القيم
- URL يجب أن يبدأ بـ `https://`
- لا ينتهي بـ `/`

**إذا كان الملف يحتوي على علامات اقتباس، أزلهم:**

```env
# ❌ خطأ
VITE_SUPABASE_URL="https://wpephofbbvqmllmueumw.supabase.co"

# ✅ صحيح
VITE_SUPABASE_URL=https://wpephofbbvqmllmueumw.supabase.co
```

---

## 🎯 الخطوة 4: إعادة تشغيل التطبيق

```bash
# أوقف التطبيق (Ctrl+C)
npm run dev
```

**مهم:** يجب إعادة التشغيل بعد أي تعديل على `.env`!

---

## 🔍 التشخيص التفصيلي

### إذا رأيت 404 في الاختبار:

**المشكلة:** Edge Functions غير منشورة

**الحل:**
1. اذهب إلى Supabase Dashboard
2. Edge Functions
3. إذا لم ترى 3 functions → أنشئهم (راجع الخطوة 2)
4. إذا رأيت functions لكن الاختبار يفشل → تحقق من الكود

### إذا رأيت 401 في الاختبار:

**المشكلة:** Anon Key غير صحيح

**الحل:**
1. Supabase Dashboard → Settings → API
2. انسخ `anon` `public` key
3. الصقه في `.env`
4. أعد تشغيل التطبيق

### إذا رأيت "Failed to fetch":

**المشكلة:** مشكلة في الاتصال

**الحل:**
1. تحقق من URL (يجب أن يكون صحيح)
2. تحقق من أن Edge Functions منشورة
3. تحقق من Console (F12) للأخطاء

---

## ✅ Checklist نهائي

- [ ] Edge Functions منشورة (3 functions)
- [ ] ملف `.env` موجود وصحيح (بدون علامات اقتباس)
- [ ] تم إعادة تشغيل التطبيق
- [ ] الاختبار من `test-edge-functions.html` نجح

---

## 🎯 الحل السريع جداً

1. **افتح `test-edge-functions.html`** في المتصفح
2. **اضغط "اختبار الكل"**
3. **إذا رأيت 404:** Edge Functions غير منشورة → راجع الخطوة 2
4. **إذا نجح:** المشكلة في التطبيق → أعد تشغيل التطبيق

---

**💡 نصيحة:** استخدم `test-edge-functions.html` للتحقق السريع من Edge Functions!

