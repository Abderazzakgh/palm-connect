# ✅ التحقق والإصلاح النهائي

## 🔍 التحقق السريع

### 1. افتح Console في المتصفح (F12)

الصق هذا الكود للتحقق:

```javascript
// استبدل بمعلوماتك من .env
const url = 'https://wpephofbbvqmllmueumw.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwZXBob2ZiYnZxbWxsbXVldW13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3NTUzNDksImV4cCI6MjA3ODMzMTM0OX0.4kFsfTkKoGcGkYF9v0_PBHpl69nN9E4ceXXsJTa3FGo';

console.log('اختبار handshake...');
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
    console.log('الحل: اذهب إلى Supabase Dashboard → Edge Functions → Create a new function');
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
  console.log('السبب: Edge Functions غير منشورة أو URL غير صحيح');
});
```

**إذا رأيت 404:** Edge Functions غير منشورة ← الحل أدناه

---

## ✅ الحل: نشر Edge Functions (خطوة بخطوة)

### الخطوة 1: فتح Supabase Dashboard

1. اذهب إلى: **https://supabase.com/dashboard**
2. سجل الدخول
3. اختر مشروعك (URL: `wpephofbbvqmllmueumw`)

---

### الخطوة 2: نشر handshake

1. **Edge Functions** → **Create a new function**
2. **Name:** `handshake` (بالضبط)
3. **Code:**
   ```
   افتح ملف: supabase/functions/handshake/index.ts
   انسخ كل المحتوى (Ctrl+A, Ctrl+C)
   الصقه في Code Editor (Ctrl+V)
   ```
4. **Deploy** (أو Save)

**✅ يجب أن ترى `handshake` في القائمة**

---

### الخطوة 3: نشر vein-upload

1. **Create a new function** مرة أخرى
2. **Name:** `vein-upload`
3. **Code:**
   ```
   افتح: supabase/functions/vein-upload/index.ts
   انسخ كل المحتوى
   الصقه
   ```
4. **Deploy**

**✅ يجب أن ترى `vein-upload` في القائمة**

---

### الخطوة 4: نشر vein-secure-upload

1. **Create a new function** مرة أخرى
2. **Name:** `vein-secure-upload`
3. **Code:**
   ```
   افتح: supabase/functions/vein-secure-upload/index.ts
   انسخ كل المحتوى
   الصقه
   ```
4. **Deploy**

**✅ يجب أن ترى `vein-secure-upload` في القائمة**

---

## ✅ التحقق النهائي

بعد نشر جميع Functions:

1. **يجب أن ترى 3 functions:**
   - ✅ `handshake`
   - ✅ `vein-upload`
   - ✅ `vein-secure-upload`

2. **اختبار من Console (F12):**
   - الصق الكود أعلاه
   - يجب أن ترى Status: 200 و JSON response

3. **اختبار من التطبيق:**
   - أعد تشغيل: `npm run dev`
   - Complete Profile → إرسال آمن (ECDH)
   - ✅ يجب أن ترى "تم الإرسال الآمن بنجاح"

---

## 🆘 إذا استمرت المشكلة

### تحقق من:

1. **Edge Functions منشورة؟**
   - Supabase Dashboard → Edge Functions
   - يجب أن ترى 3 functions

2. **URL صحيح؟**
   - من `.env`: `https://wpephofbbvqmllmueumw.supabase.co`
   - تأكد من عدم وجود `/` في النهاية

3. **Anon Key صحيح؟**
   - من `.env`: يجب أن يبدأ بـ `eyJ...`
   - تأكد من نسخه كاملاً

4. **تم إعادة تشغيل التطبيق؟**
   - بعد تعديل `.env` يجب إعادة التشغيل

---

## 💡 السبب الأكثر احتمالاً

**99%:** Edge Functions غير منشورة

**الحل:** راجع الخطوات 2-4 أعلاه

---

**✅ بعد نشر Edge Functions، يجب أن يعمل كل شيء!**

