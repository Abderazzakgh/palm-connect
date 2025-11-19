#!/bin/bash
# Bash script to deploy Supabase Edge Functions
# Usage: ./deploy-functions.sh

echo "🚀 بدء نشر Supabase Edge Functions..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI غير مثبت!"
    echo "قم بتثبيته باستخدام: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI موجود"

# Check if logged in
echo ""
echo "🔐 التحقق من تسجيل الدخول..."
if ! supabase projects list &> /dev/null; then
    echo "⚠️  يبدو أنك غير مسجل الدخول. قم بتسجيل الدخول أولاً:"
    echo "   supabase login"
    exit 1
fi

echo "✅ تم تسجيل الدخول بنجاح"

# Link project
echo ""
echo "🔗 ربط المشروع..."
supabase link --project-ref qxtdcqwhqfuhlhwoffem
if [ $? -ne 0 ]; then
    echo "❌ فشل ربط المشروع"
    exit 1
fi
echo "✅ تم ربط المشروع بنجاح"

# Deploy functions
functions=("handshake" "vein-upload" "vein-secure-upload")

for func in "${functions[@]}"; do
    echo ""
    echo "📦 نشر $func..."
    supabase functions deploy $func
    if [ $? -eq 0 ]; then
        echo "✅ تم نشر $func بنجاح"
    else
        echo "❌ فشل نشر $func"
    fi
done

echo ""
echo "✨ انتهى النشر!"
echo ""
echo "📝 الخطوات التالية:"
echo "   1. تطبيق migrations: supabase db push"
echo "   2. اختبار Functions من Dashboard"
echo "   3. التحقق من RLS Policies"

