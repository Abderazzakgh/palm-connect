import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Scan, Shield, QrCode, CreditCard, CheckCircle2, User, ArrowRight, Sparkles } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@radix-ui/react-accordion";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-amber-50/30 text-foreground">

      {/* -------------------- HERO SECTION -------------------- */}
      <section className="relative overflow-hidden pt-20 pb-32 bg-gradient-to-br from-blue-950 via-blue-900 to-amber-900">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDEzNGg3djFoLTd6bTE4IDB2MWg3di0xek0xMiAxNTBoMXY3aC0xek0xMzQgMzZoMXY3aC0xek0zIDNDLjc5IDMgLjc5IDEgMyAxaDEwYzIuMjEgMCAyLjIxIDIgMCAySDN6bS0xIDloLTF2N2gxek0zIDloYzIuMjEgMCAyLjIxIDIgMCAySDFjLTIuMjEgMC0yLjIxLTIgMC0yaDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20"></div>
        
        <div className="container mx-auto px-4 text-center max-w-4xl relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 backdrop-blur-sm border border-amber-400/40 mb-8 animate-pulse">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span className="text-amber-100 text-sm font-medium">نظام المصادقة البيومترية الأكثر أماناً</span>
          </div>
          
          <img
            src="/favicon.ico"
            alt="شعار سافانا"
            className="w-28 h-28 mx-auto mb-8 rounded-full shadow-2xl ring-4 ring-amber-400/50 animate-float"
          />
          
          <h1 className="text-5xl md:text-7xl font-extrabold bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 bg-clip-text text-transparent mb-6 drop-shadow-2xl leading-tight">
            سافانا
            <span className="block text-3xl md:text-4xl mt-2 text-amber-100 font-normal">نظام المصادقة البيومترية</span>
          </h1>
          
          <p className="text-xl md:text-2xl mb-10 text-white/90 leading-relaxed max-w-2xl mx-auto">
            مصادقة سريعة وآمنة عبر بصمة الكف — تجربة مصرفية بلا لمس، أمان بلا حدود
          </p>
          
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/scanner">
              <Button size="lg" className="text-lg px-10 py-6 bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-bold rounded-xl shadow-2xl hover:scale-105 hover:shadow-amber-500/50 hover:from-amber-600 hover:to-yellow-700 transition-all duration-300 group">
                <Scan className="ml-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                ابدأ المسح الآن
                <ArrowRight className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            
            <Link to="/auth">
              <Button size="lg" variant="outline" className="text-lg px-10 py-6 bg-transparent border-2 border-amber-400 text-amber-100 hover:bg-amber-400 hover:text-blue-950 rounded-xl shadow-lg hover:scale-105 transition-all duration-300">
                <User className="ml-2 h-5 w-5" />
                تسجيل الدخول
              </Button>
            </Link>
          </div>

          <div className="mt-12 flex gap-8 justify-center text-amber-100 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-amber-400" />
              <span>تشفير متقدم</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-amber-400" />
              <span>سرعة فائقة</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-amber-400" />
              <span>سهولة استخدام</span>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- FEATURES SECTION -------------------- */}
      <section className="py-24 bg-gradient-to-b from-white to-amber-50/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-950 via-blue-900 to-amber-700 bg-clip-text text-transparent">
              كيف يعمل النظام؟
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              خمس خطوات بسيطة للحصول على تجربة مصرفية آمنة وسريعة
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 max-w-7xl mx-auto">
            {/* 1. إنشاء حساب */}
            <Card className="text-center hover:shadow-2xl transition-all duration-300 hover:-translate-y-3 border-2 hover:border-amber-300 bg-white group">
              <CardContent className="pt-8 pb-6">
                <div className="w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center bg-gradient-to-br from-amber-100 to-yellow-50 group-hover:from-amber-200 group-hover:to-yellow-100 transition-all duration-300 shadow-lg">
                  <User className="h-10 w-10 text-blue-950" />
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent mb-2">1</div>
                <h3 className="text-xl font-bold mb-3 text-blue-950">إنشاء حساب</h3>
                <p className="text-muted-foreground leading-relaxed">ابدأ بإنشاء حسابك الآمن في التطبيق بخطوات بسيطة</p>
              </CardContent>
            </Card>

            {/* 2. مسح الكف */}
            <Card className="text-center hover:shadow-2xl transition-all duration-300 hover:-translate-y-3 border-2 hover:border-blue-300 bg-white group">
              <CardContent className="pt-8 pb-6">
                <div className="w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50 group-hover:from-blue-200 group-hover:to-blue-100 transition-all duration-300 shadow-lg">
                  <Scan className="h-10 w-10 text-blue-950" />
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent mb-2">2</div>
                <h3 className="text-xl font-bold mb-3 text-blue-950">مسح الكف</h3>
                <p className="text-muted-foreground leading-relaxed">مرر كفك على الجهاز لتسجيل بصمتك الفريدة</p>
              </CardContent>
            </Card>

            {/* 3. استلام الباركود */}
            <Card className="text-center hover:shadow-2xl transition-all duration-300 hover:-translate-y-3 border-2 hover:border-amber-300 bg-white group">
              <CardContent className="pt-8 pb-6">
                <div className="w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center bg-gradient-to-br from-amber-100 to-yellow-50 group-hover:from-amber-200 group-hover:to-yellow-100 transition-all duration-300 shadow-lg">
                  <QrCode className="h-10 w-10 text-blue-950" />
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent mb-2">3</div>
                <h3 className="text-xl font-bold mb-3 text-blue-950">استلام الباركود</h3>
                <p className="text-muted-foreground leading-relaxed">احصل على باركود فريد مرتبط ببصمتك</p>
              </CardContent>
            </Card>

            {/* 4. إكمال البيانات */}
            <Card className="text-center hover:shadow-2xl transition-all duration-300 hover:-translate-y-3 border-2 hover:border-blue-300 bg-white group">
              <CardContent className="pt-8 pb-6">
                <div className="w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50 group-hover:from-blue-200 group-hover:to-blue-100 transition-all duration-300 shadow-lg">
                  <CheckCircle2 className="h-10 w-10 text-blue-950" />
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent mb-2">4</div>
                <h3 className="text-xl font-bold mb-3 text-blue-950">إكمال الملف</h3>
                <p className="text-muted-foreground leading-relaxed">أكمل معلوماتك الشخصية والبنكية</p>
              </CardContent>
            </Card>

            {/* 5. ربط البطاقة */}
            <Card className="text-center hover:shadow-2xl transition-all duration-300 hover:-translate-y-3 border-2 hover:border-amber-300 bg-white group">
              <CardContent className="pt-8 pb-6">
                <div className="w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center bg-gradient-to-br from-amber-100 to-yellow-50 group-hover:from-amber-200 group-hover:to-yellow-100 transition-all duration-300 shadow-lg">
                  <CreditCard className="h-10 w-10 text-blue-950" />
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent mb-2">5</div>
                <h3 className="text-xl font-bold mb-3 text-blue-950">ربط البطاقة</h3>
                <p className="text-muted-foreground leading-relaxed">اربط بطاقتك وابدأ الدفع ببصمة الكف</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* -------------------- SECURITY SECTION -------------------- */}
      <section className="py-24 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0NGg3djFoLTd6bTE4IDB2MWg3di0xek0xMiAxNTBoMXY3aC0xek0xMzQgMzZoMXY3aC0xek0zIDNDLjc5IDMgLjc5IDEgMyAxaDEwYzIuMjEgMCAyLjIxIDIgMCAySDN6bS0xIDloLTF2N2gxek0zIDloYzIuMjEgMCAyLjIxIDIgMCAySDFjLTIuMjEgMC0yLjIxLTIgMC0yaDJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-10"></div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center justify-center w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 backdrop-blur-sm shadow-2xl border border-amber-400/30">
            <Shield className="h-12 w-12 text-amber-300 drop-shadow-lg" />
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">أمان متقدم بتقنية عالمية</h2>
          
          <p className="text-xl text-white/90 max-w-3xl mx-auto leading-relaxed mb-8">
            بياناتك مشفرة بالكامل ولا تُخزن بصمتك بشكل مباشر — نستخدم تقنيات التشفير من الجيل التالي لحماية معلوماتك
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12">
            <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 backdrop-blur-sm rounded-xl p-6 border border-amber-400/30">
              <h4 className="text-amber-300 font-bold text-lg mb-2">تشفير AES-256</h4>
              <p className="text-amber-100/80 text-sm">معيار التشفير المتقدم</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 backdrop-blur-sm rounded-xl p-6 border border-amber-400/30">
              <h4 className="text-amber-300 font-bold text-lg mb-2">معتمد دولياً</h4>
              <p className="text-amber-100/80 text-sm">متوافق مع المعايير العالمية</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 backdrop-blur-sm rounded-xl p-6 border border-amber-400/30">
              <h4 className="text-amber-300 font-bold text-lg mb-2">حماية 24/7</h4>
              <p className="text-amber-100/80 text-sm">مراقبة مستمرة للنظام</p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- PRICING SECTION -------------------- */}
      <section className="py-24 bg-gradient-to-b from-amber-50/30 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-950 via-blue-900 to-amber-700 bg-clip-text text-transparent">
              اختر الخطة المناسبة لك
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              ابدأ بتجربة مجانية لمدة 7 أيام، ثم اختر الخطة التي تناسب احتياجاتك
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <Card className="text-center border-2 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:border-amber-300 relative overflow-hidden group bg-white">
              <CardContent className="pt-8 pb-8">
                <h3 className="text-2xl font-bold mb-2 text-blue-950">الخطة المجانية</h3>
                <p className="text-muted-foreground mb-6">تجربة محدودة لمدة 7 أيام</p>
                <div className="mb-8">
                  <h4 className="text-5xl font-bold text-blue-950 mb-2">
                    0 <span className="text-2xl">د.ت</span>
                  </h4>
                  <p className="text-sm text-muted-foreground">لمدة 7 أيام</p>
                </div>
                <ul className="text-right space-y-3 mb-8 px-4">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">مسح يومي واحد</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">إصدار باركود واحد</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0">✖</span>
                    <span className="text-muted-foreground line-through">ربط حساب بنكي</span>
                  </li>
                </ul>
                <Link to="/auth">
                  <Button variant="outline" className="w-full py-6 text-lg font-semibold border-2 border-blue-950 text-blue-950 hover:bg-blue-950 hover:text-white transition-all duration-300">
                    ابدأ مجانًا
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Standard Plan - Most Popular */}
            <Card className="text-center border-2 border-amber-500 shadow-2xl transition-all duration-300 hover:-translate-y-2 relative overflow-hidden group bg-white scale-105">
              <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-600 to-yellow-600 text-white py-2 text-sm font-bold">
                الأكثر شعبية ⭐
              </div>
              <CardContent className="pt-16 pb-8">
                <h3 className="text-2xl font-bold mb-2 text-blue-950">الخطة الأساسية</h3>
                <p className="text-muted-foreground mb-6">مناسبة للمستخدم العادي</p>
                <div className="mb-8">
                  <h4 className="text-5xl font-bold bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent mb-2">
                    19 <span className="text-2xl">د.ت</span>
                  </h4>
                  <p className="text-sm text-muted-foreground">شهرياً</p>
                </div>
                <ul className="text-right space-y-3 mb-8 px-4">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">مسح غير محدود</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">إصدار باركود تلقائي</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">ربط حساب بنكي واحد</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">دعم فني عبر البريد</span>
                  </li>
                </ul>
                <Link to="/auth">
                  <Button className="w-full py-6 text-lg font-semibold bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                    اشترك الآن
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="text-center border-2 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:border-blue-300 relative overflow-hidden group bg-white">
              <CardContent className="pt-8 pb-8">
                <h3 className="text-2xl font-bold mb-2 text-blue-950">الخطة الاحترافية</h3>
                <p className="text-muted-foreground mb-6">للمستخدمين والشركات</p>
                <div className="mb-8">
                  <h4 className="text-5xl font-bold text-blue-950 mb-2">
                    39 <span className="text-2xl">د.ت</span>
                  </h4>
                  <p className="text-sm text-muted-foreground">شهرياً</p>
                </div>
                <ul className="text-right space-y-3 mb-8 px-4">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">كل مميزات الخطة الأساسية</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">دعم فوري 24/7</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">ربط عدة حسابات بنكية</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">تقارير وتحليلات متقدمة</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground">أولوية في المعالجة</span>
                  </li>
                </ul>
                <Link to="/auth">
                  <Button variant="outline" className="w-full py-6 text-lg font-semibold border-2 border-blue-950 text-blue-950 hover:bg-blue-950 hover:text-white transition-all duration-300">
                    اختر الخطة
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* -------------------- FAQ SECTION -------------------- */}
      <section className="py-24 bg-gradient-to-b from-white to-amber-50/30">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-950 via-blue-900 to-amber-700 bg-clip-text text-transparent">
              الأسئلة الشائعة
            </h2>
            <p className="text-lg text-muted-foreground">
              إجابات على الأسئلة الأكثر شيوعاً حول نظام سافانا
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="item-1" className="border-2 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 bg-white hover:border-amber-300">
              <AccordionTrigger className="font-bold text-lg text-blue-950 text-right hover:text-amber-700 transition-colors">
                كيف أبدأ التجربة المجانية؟
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground mt-4 text-right leading-relaxed">
                يمكنك الضغط على "ابدأ مجانًا" في صفحة الباقات، وستبدأ الفترة التجريبية فورًا لمدة 7 أيام. لا حاجة لبطاقة ائتمان للبدء!
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2" className="border-2 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 bg-white hover:border-amber-300">
              <AccordionTrigger className="font-bold text-lg text-blue-950 text-right hover:text-amber-700 transition-colors">
                هل يمكن ربط أكثر من بطاقة؟
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground mt-4 text-right leading-relaxed">
                نعم، في الخطة الاحترافية يمكنك ربط عدة حسابات بنكية وإدارتها جميعاً من لوحة التحكم الخاصة بك.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3" className="border-2 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 bg-white hover:border-amber-300">
              <AccordionTrigger className="font-bold text-lg text-blue-950 text-right hover:text-amber-700 transition-colors">
                هل بياناتي مؤمنة؟
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground mt-4 text-right leading-relaxed">
                بالتأكيد، جميع البيانات مشفرة بتقنية AES-256 ولا تُخزن بصمتك بشكل مباشر. نستخدم فقط توقيع رقمي فريد لا يمكن إعادة بناء البصمة منه.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4" className="border-2 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 bg-white hover:border-amber-300">
              <AccordionTrigger className="font-bold text-lg text-blue-950 text-right hover:text-amber-700 transition-colors">
                ما مدى سرعة عملية المصادقة؟
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground mt-4 text-right leading-relaxed">
                عملية المصادقة تستغرق أقل من ثانية واحدة! فقط مرر كفك على الجهاز وسيتم التحقق تلقائياً.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5" className="border-2 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 bg-white hover:border-amber-300">
              <AccordionTrigger className="font-bold text-lg text-blue-950 text-right hover:text-amber-700 transition-colors">
                هل يمكنني إلغاء الاشتراك في أي وقت؟
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground mt-4 text-right leading-relaxed">
                نعم، يمكنك إلغاء اشتراكك في أي وقت من لوحة التحكم دون أي رسوم إضافية. سيظل حسابك نشطاً حتى نهاية الفترة المدفوعة.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* -------------------- FOOTER -------------------- */}
      <footer className="py-16 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-950 text-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            {/* About */}
            <div>
              <h3 className="text-xl font-bold mb-4">عن سافانا</h3>
              <p className="text-white/80 leading-relaxed">
                نظام المصادقة البيومترية الأكثر أماناً وسرعة في المنطقة
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-xl font-bold mb-4">روابط سريعة</h3>
              <ul className="space-y-2">
                <li><Link to="/scanner" className="text-white/80 hover:text-white transition-colors">ابدأ المسح</Link></li>
                <li><Link to="/auth" className="text-white/80 hover:text-white transition-colors">تسجيل الدخول</Link></li>
                <li><Link to="/dashboard" className="text-white/80 hover:text-white transition-colors">لوحة التحكم</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-xl font-bold mb-4">الدعم</h3>
              <ul className="space-y-2">
                <li><a href="mailto:support@savanna.tn" className="text-white/80 hover:text-white transition-colors">support@savanna.tn</a></li>
                <li><a href="tel:+21612345678" className="text-white/80 hover:text-white transition-colors">+216 12 345 678</a></li>
                <li><span className="text-white/80">الدعم متاح 24/7</span></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-xl font-bold mb-4">قانوني</h3>
              <ul className="space-y-2">
                <li><Link to="/privacy" className="text-white/80 hover:text-white transition-colors">سياسة الخصوصية</Link></li>
                <li><Link to="/terms" className="text-white/80 hover:text-white transition-colors">شروط الاستخدام</Link></li>
                <li><Link to="/contact" className="text-white/80 hover:text-white transition-colors">تواصل معنا</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/20 pt-8 text-center">
            <p className="text-white/80">© 2025 Savanna. جميع الحقوق محفوظة.</p>
            <p className="text-white/60 text-sm mt-2">صُنع بـ ❤️ في تونس</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
