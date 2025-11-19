# دليل الانتقال من السيرفر المحلي إلى Supabase

تم تحديث المشروع لاستخدام Supabase بدلاً من السيرفر المحلي.

## التغييرات الرئيسية

### 1. Supabase Edge Functions
تم إنشاء ثلاث Edge Functions لاستبدال endpoints السيرفر المحلي:

- **`supabase/functions/handshake`**: لتبادل مفاتيح ECDH
- **`supabase/functions/vein-upload`**: لرفع البيانات المشفرة (بسيط)
- **`supabase/functions/vein-secure-upload`**: لرفع البيانات المشفرة (آمن مع ECDH)

### 2. قاعدة البيانات
تم إضافة جدولين جديدين:

- **`handshakes`**: لتخزين بيانات handshake لتبادل المفاتيح
- **`palm_vein_data`**: لتخزين بيانات بصمة الكف المشفرة

### 3. تحديثات الكود
- تم تحديث `src/components/CompleteProfile.tsx` لاستخدام Supabase Edge Functions بدلاً من `localhost:4000`

## خطوات التطبيق

### 1. تشغيل Migrations
```bash
# تطبيق migrations الجديدة
supabase db push
```

أو من خلال Supabase Dashboard:
- اذهب إلى SQL Editor
- قم بتشغيل ملفات migration من `supabase/migrations/`

### 2. نشر Edge Functions
```bash
# نشر جميع Edge Functions
supabase functions deploy handshake
supabase functions deploy vein-upload
supabase functions deploy vein-secure-upload
```

### 3. إعداد متغيرات البيئة
تأكد من وجود المتغيرات التالية في `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### 4. ملاحظات مهمة

#### ⚠️ قيود حالية
1. **Handshake Function**: حالياً يقوم بإنشاء مفتاح جديد في كل مرة. للإنتاج، يجب:
   - تخزين زوج المفاتيح (public/private) في Supabase Secrets
   - استخدام نفس المفتاح الخاص في جميع handshakes

2. **Secure Upload**: يحتاج إلى تحديث لاستخدام المفتاح الخاص المخزن في Secrets

#### 🔧 تحسينات مقترحة
1. إضافة Supabase Secret للمفتاح الخاص للخادم
2. تحديث `vein-secure-upload` لاستخدام HKDF و ECDH بشكل صحيح
3. إضافة معالجة لخدمة الخوارزمية (algorithm service) إذا كانت موجودة

## البنية الجديدة

```
supabase/
├── functions/
│   ├── handshake/
│   │   └── index.ts
│   ├── vein-upload/
│   │   └── index.ts
│   └── vein-secure-upload/
│       └── index.ts
└── migrations/
    └── 20251106030000_create_handshakes_table.sql
```

## الاختبار

بعد تطبيق التغييرات:
1. تأكد من أن Edge Functions تعمل بشكل صحيح
2. اختبر handshake endpoint
3. اختبر upload endpoints
4. تحقق من البيانات المخزنة في قاعدة البيانات

## الدعم

إذا واجهت أي مشاكل:
1. تحقق من logs في Supabase Dashboard
2. تأكد من أن Edge Functions تم نشرها بنجاح
3. تحقق من متغيرات البيئة

