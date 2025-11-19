# PowerShell script to deploy Supabase Edge Functions
# Usage: .\deploy-functions.ps1

Write-Host "🚀 بدء نشر Supabase Edge Functions..." -ForegroundColor Green

# Check if Supabase CLI is installed
$supabaseInstalled = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseInstalled) {
    Write-Host "❌ Supabase CLI غير مثبت!" -ForegroundColor Red
    Write-Host "قم بتثبيته باستخدام: npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase CLI موجود" -ForegroundColor Green

# Check if logged in
Write-Host "`n🔐 التحقق من تسجيل الدخول..." -ForegroundColor Cyan
$loginCheck = supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  يبدو أنك غير مسجل الدخول. قم بتسجيل الدخول أولاً:" -ForegroundColor Yellow
    Write-Host "   supabase login" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ تم تسجيل الدخول بنجاح" -ForegroundColor Green

# Link project
Write-Host "`n🔗 ربط المشروع..." -ForegroundColor Cyan
supabase link --project-ref qxtdcqwhqfuhlhwoffem
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ فشل ربط المشروع" -ForegroundColor Red
    exit 1
}
Write-Host "✅ تم ربط المشروع بنجاح" -ForegroundColor Green

# Deploy functions
$functions = @("handshake", "vein-upload", "vein-secure-upload")

foreach ($func in $functions) {
    Write-Host "`n📦 نشر $func..." -ForegroundColor Cyan
    supabase functions deploy $func
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ تم نشر $func بنجاح" -ForegroundColor Green
    } else {
        Write-Host "❌ فشل نشر $func" -ForegroundColor Red
    }
}

Write-Host "`n✨ انتهى النشر!" -ForegroundColor Green
Write-Host "`n📝 الخطوات التالية:" -ForegroundColor Yellow
Write-Host "   1. تطبيق migrations: supabase db push" -ForegroundColor White
Write-Host "   2. اختبار Functions من Dashboard" -ForegroundColor White
Write-Host "   3. التحقق من RLS Policies" -ForegroundColor White

