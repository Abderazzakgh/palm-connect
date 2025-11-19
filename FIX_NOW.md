# 🔧 إصلاح فوري - خطوات واضحة

## ⚠️ المشكلة المكتشفة

ملف `.env` يحتوي على URL مختلف:
- في `.env`: `wpephofbbvqmllmueumw.supabase.co`
- في الكود: `qxtdcqwhqfuhlhwoffem.supabase.co`

**الحل:** استخدم URL من `.env` الحالي (هو الصحيح لمشروعك)

---

## ✅ الحل السريع (3 خطوات فقط!)

### الخطوة 1: التحقق من `.env` ✅

ملف `.env` موجود ويحتوي على:
```
VITE_SUPABASE_URL="https://wpephofbbvqmllmueumw.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**✅ هذا صحيح!** لا تغيره.

---

### الخطوة 2: نشر Edge Functions (الأهم!) ⚡

**هذه هي المشكلة الرئيسية!**

1. **افتح Supabase Dashboard:**
   - https://supabase.com/dashboard
   - اختر مشروعك (الذي يحتوي على URL: `wpephofbbvqmllmueumw`)

2. **Edge Functions** → **Create a new function**

**Function 1: handshake**
- **Name:** `handshake`
- افتح: `supabase/functions/handshake/index.ts`
- انسخ **كل** المحتوى
- الصقه في Code Editor
- **Deploy** ✅

**Function 2: vein-upload**
- **Name:** `vein-upload`
- افتح: `supabase/functions/vein-upload/index.ts`
- انسخ **كل** المحتوى
- الصقه في Code Editor
- **Deploy** ✅

**Function 3: vein-secure-upload**
- **Name:** `vein-secure-upload`
- افتح: `supabase/functions/vein-secure-upload/index.ts`
- انسخ **كل** المحتوى
- الصقه في Code Editor
- **Deploy** ✅

**✅ يجب أن ترى 3 functions في القائمة**

---

### الخطوة 3: إعادة تشغيل التطبيق ⚡

```bash
# أوقف التطبيق (Ctrl+C)
npm run dev
```

**مهم:** يجب إعادة التشغيل بعد أي تعديل على `.env`!

---

## 🧪 اختبار سريع

بعد تطبيق الخطوات:

1. **افتح:** http://localhost:5173
2. **Complete Profile** → **التقط صورة**
3. **إرسال آمن (ECDH)**

**يجب أن ترى:**
- ✅ "تم الإرسال الآمن بنجاح"
- ❌ **لا** ترى "Failed to fetch"

---

## 🔍 إذا استمرت المشكلة

### اختبار مباشر من Console (F12):

افتح Console (F12) والصق:

```javascript
const url = 'https://wpephofbbvqmllmueumw.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwZXBob2ZiYnZxbWxsbXVldW13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NTUzNDksImV4cCI6MjA3ODMzMTM0OX0.4kFsfTkKoGcGkYF9v0_PBHpl69nN9E4ceXXsJTa3FGo';

fetch(`${url}/functions/v1/handshake`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
  },
})
.then(r => {
  console.log('Status:', r.status);
  if (!r.ok) {
    return r.text().then(text => {
      throw new Error(`HTTP ${r.status}: ${text}`);
    });
  }
  return r.json();
})
.then(data => {
  console.log('✅ نجح!', data);
})
.catch(err => {
  console.error('❌ فشل:', err.message);
});
```

**إذا نجح:** Edge Function يعمل ✅
**إذا فشل بـ 404:** Function غير منشورة (راجع الخطوة 2)
**إذا فشل بـ 401:** anon key غير صحيح

---

## 📋 Checklist

- [ ] Edge Functions منشورة (3 functions) ← **الأهم!**
- [ ] ملف `.env` موجود وصحيح
- [ ] تم إعادة تشغيل التطبيق

---

## 💡 السبب الأكثر احتمالاً

**90% من الحالات:** Edge Functions غير منشورة!

**الحل:** راجع الخطوة 2 ونشر جميع Functions

---

**✅ بعد نشر Edge Functions وإعادة تشغيل التطبيق، يجب أن يعمل كل شيء!**

