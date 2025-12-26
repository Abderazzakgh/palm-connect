# حل مشكلة Rollup على Vercel

## المشكلة
كانت Vercel تستخدم Node.js v22.21.1 والتي تسبب مشاكل توافق مع Rollup native modules.

## الحلول المطبقة

### 1. تحديد نسخة Node.js
تم تحديث الملفات التالية لفرض استخدام Node.js 20.x:
- `.nvmrc` → `20.18.0`
- `.node-version` → `20.18.0` (جديد)
- `vercel.json` → إضافة `NODE_VERSION: "20.x"`

### 2. تحديث vercel.json
تمت إضافة التكوينات التالية:
```json
{
  "build": {
    "env": {
      "NODE_VERSION": "20.x"
    }
  },
  "functions": {
    "node": {
      "maxDuration": 10
    }
  }
}
```

## خطوات الرفع على Vercel

### الطريقة 1: عبر Git (موصى بها)
```bash
git add .
git commit -m "fix: Update Node.js version for Vercel compatibility"
git push
```

سيتم إعادة البناء تلقائياً على Vercel باستخدام Node.js 20.x

### الطريقة 2: عبر Vercel CLI
```bash
# تثبيت Vercel CLI إذا لم يكن مثبتاً
npm i -g vercel

# الرفع
vercel --prod
```

### الطريقة 3: عبر لوحة تحكم Vercel
1. اذهب إلى [vercel.com](https://vercel.com)
2. اختر مشروعك
3. اذهب إلى Settings → General
4. في قسم "Node.js Version"، اختر `20.x`
5. اذهب إلى Deployments
6. اضغط على "Redeploy" للنشر الأخير

## التحقق من النجاح

بعد الرفع، تحقق من:
1. ✅ Build logs تظهر `Node.js 20.x`
2. ✅ لا توجد أخطاء `MODULE_NOT_FOUND`
3. ✅ البناء يكتمل بنجاح
4. ✅ الموقع يعمل بشكل صحيح

## إذا استمرت المشكلة

### حل إضافي 1: تنظيف الـ cache
في لوحة تحكم Vercel:
1. اذهب إلى Settings → General
2. مرر لأسفل إلى "Build & Development Settings"
3. فعّل "Clear Build Cache"
4. أعد النشر

### حل إضافي 2: تحديث التبعيات
```bash
# حذف node_modules و package-lock.json
rm -rf node_modules package-lock.json

# إعادة التثبيت
npm install

# إعادة البناء
npm run build

# رفع التغييرات
git add package-lock.json
git commit -m "chore: Update dependencies lock file"
git push
```

### حل إضافي 3: استخدام pnpm بدلاً من npm
في `vercel.json`:
```json
{
  "installCommand": "pnpm install",
  "buildCommand": "pnpm run build"
}
```

## ملاحظات مهمة

- ⚠️ Node.js v22 لا تزال جديدة وقد تواجه مشاكل توافق
- ✅ Node.js v20 LTS هي الأكثر استقراراً للإنتاج
- 📝 تأكد من أن `.nvmrc` و `.node-version` في Git
- 🔄 Vercel تقرأ هذه الملفات تلقائياً

## الاختبار المحلي

قبل الرفع، تأكد من أن البناء يعمل محلياً:
```bash
npm run build
```

إذا نجح محلياً، سينجح على Vercel بنفس نسخة Node.js.

## روابط مفيدة

- [Vercel Node.js Version](https://vercel.com/docs/functions/runtimes/node-js)
- [Vite Deployment](https://vitejs.dev/guide/static-deploy.html#vercel)
- [Rollup Native Modules](https://rollupjs.org/troubleshooting/#native-modules)
