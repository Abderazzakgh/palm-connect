import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Scan, Shield, QrCode, CreditCard, CheckCircle2, User, ArrowRight, Sparkles, History, X } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const Index = () => {
  return (
    <div className="min-h-screen bg-[#050B18] text-foreground">

      {/* -------------------- HERO SECTION -------------------- */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden mesh-bg">
        {/* Animated Background Orbs */}
        <div className="absolute top-0 -left-1/4 w-[800px] h-[800px] bg-secondary/10 rounded-full blur-[160px] animate-blob"></div>
        <div className="absolute -bottom-1/4 -right-1/4 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[160px] animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.05)_0%,transparent_70%)]"></div>

        {/* Scanline Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(255,255,255,0.02)_50%,transparent_100%)] bg-[length:100%_4px] animate-scanline pointer-events-none"></div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="text-right order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full glass-card border-secondary/20 mb-8 animate-fade-in">
                <Sparkles className="h-4 w-4 text-secondary" />
                <span className="text-secondary/90 text-sm font-black tracking-widest uppercase">ثورة الهوية الرقمية القادمة</span>
              </div>

              <h1 className="text-7xl md:text-9xl font-black text-white mb-6 tracking-tighter leading-[0.9] animate-fade-down uppercase">
                سافانـــا
              </h1>
              <h2 className="text-3xl md:text-4xl font-light text-secondary/80 mb-10 tracking-tight animate-fade-down animation-delay-300">
                بصمتك هي <span className="font-bold text-white relative">
                  مفتاحك
                  <span className="absolute -bottom-2 right-0 w-full h-1 bg-gradient-to-l from-secondary to-transparent"></span>
                </span> للمستقبل
              </h2>

              <p className="text-xl md:text-2xl mb-12 text-white/50 leading-relaxed font-light animate-fade-up animation-delay-500 max-w-xl mr-auto lg:mr-0">
                وداعاً للبطاقات وكلمات المرور. سافانا هو أول نظام دفع وتحكم بالوصول في المنطقة يعتمد كلياً على <strong className="text-white">التحليل البيومتري المتقدم للكف</strong>.
              </p>

              <div className="flex gap-6 justify-end flex-wrap animate-fade-up animation-delay-700">
                <Link to="/scanner">
                  <Button size="lg" className="h-20 px-12 text-2xl bg-secondary text-primary hover:bg-white hover:scale-105 transition-all duration-700 font-black rounded-3xl shadow-[0_25px_50px_-12px_rgba(251,191,36,0.4)] group relative overflow-hidden">
                    <span className="relative z-10 flex items-center">
                      ابدأ المسح الآن
                      <Scan className="mr-4 h-7 w-7 group-hover:rotate-12 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-white transform translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                  </Button>
                </Link>

                <Link to="/auth">
                  <Button size="lg" variant="ghost" className="h-20 px-12 text-2xl text-white/60 hover:text-white hover:bg-white/5 transition-all duration-500 font-bold rounded-3xl group">
                    دخول الأعضاء
                    <User className="mr-3 h-6 w-6 group-hover:translate-x-2 transition-transform" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative order-1 lg:order-2 flex justify-center">
              <div className="relative group animate-float-slow">
                <div className="absolute -inset-10 bg-secondary/20 rounded-full blur-[80px] group-hover:bg-secondary/30 transition-all duration-1000"></div>
                <div className="relative rounded-[4rem] overflow-hidden border-2 border-white/10 shadow-[0_0_100px_rgba(251,191,36,0.1)]">
                  <img
                    src="https://images.unsplash.com/photo-1639322537228-f710d846310a?q=80&w=1000&auto=format&fit=crop"
                    alt="Futuristic Palm Scan"
                    className="w-[500px] h-[500px] object-cover hover:scale-110 transition-transform duration-[2000ms]"
                  />
                  <div className="absolute inset-0 pointer-events-none border-[20px] border-white/5"></div>
                  <div className="absolute top-10 right-10 flex flex-col gap-2 items-end">
                    <div className="h-1 w-20 bg-secondary/50 rounded-full"></div>
                    <div className="h-1 w-12 bg-secondary/30 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#050B18] to-transparent"></div>
      </section>

      {/* -------------------- FEATURES SECTION -------------------- */}
      <section className="py-40 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-32 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-black tracking-widest uppercase mb-6">
              <History className="h-3 w-3" />
              خمس خطوات للسيطرة
            </div>
            <h2 className="text-6xl md:text-8xl font-black mb-6 text-white tracking-tighter uppercase italic">
              بساطة <span className="text-secondary text-glow">مطلقة</span>
            </h2>
            <p className="text-2xl text-white/40 font-light leading-relaxed">
              لقد قمنا باختزال سنوات من التطور التقني في رحلة بسيطة لا تتعدى الدقائق.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {[
              { icon: User, title: "إنشاء هوية", desc: "سجل بياناتك الأساسية في ثوانٍ معدودة", color: "from-blue-500/10 to-primary/10" },
              { icon: Scan, title: "تحليل الكف", desc: "مسح بؤري دقيق لخرائط اليد الرقمية", color: "from-secondary/10 to-amber-500/10" },
              { icon: QrCode, title: "توليد الرمز", desc: "جهازك يولد كوداً فريداً مشفراً للربط", color: "from-primary/10 to-blue-600/10" },
              { icon: CheckCircle2, title: "التوثيق الفوري", desc: "مطابقة السجلات مع القاعدة المركزية", color: "from-green-500/10 to-emerald-600/10" },
              { icon: CreditCard, title: "حرية الاستخدام", desc: "ادفع، ادخل، وتحكم ببساطة يدك", color: "from-secondary/10 to-primary/10" }
            ].map((step, i) => (
              <div key={i} className="group relative glass-card p-12 rounded-[3rem] border-white/5 text-center transition-all duration-700 hover:-translate-y-4 hover:border-secondary/30 shadow-2xl overflow-hidden">
                <div className={`w-24 h-24 mx-auto mb-10 rounded-[2rem] bg-gradient-to-br ${step.color} flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-700 relative z-10`}>
                  <step.icon className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -top-6 -right-6 text-[10rem] font-black text-white/[0.02] group-hover:text-secondary/[0.05] transition-colors leading-none pointer-events-none">
                  {i + 1}
                </div>
                <h3 className="text-2xl font-black mb-4 text-white uppercase tracking-tight">{step.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed font-light">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------- SECURITY SECTION -------------------- */}
      <section className="py-40 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary"></div>
        <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center justify-center w-32 h-32 mx-auto mb-12 rounded-[2.5rem] bg-gradient-to-br from-secondary/20 to-primary/20 backdrop-blur-xl shadow-2xl border border-secondary/30 animate-float">
            <Shield className="h-16 w-16 text-secondary drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]" />
          </div>

          <h2 className="text-6xl md:text-7xl font-black mb-8 text-white tracking-tighter uppercase italic">
            أمان <span className="text-secondary">لا يُخترق</span>
          </h2>

          <p className="text-2xl text-white/70 max-w-4xl mx-auto leading-relaxed mb-16 font-light">
            نحن لا نقوم بتخزين بصمتك كصورة، بل نحولها إلى <span className="text-white font-bold">بصمة رقمية مشفرة (Hash)</span> فريدة من نوعها. حتى في حالة التسريب، بياناتك الأصلية تبقى آمنة في كفك فقط.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { title: "AES-256 GCM", desc: "تشفير عسكري لكل بت من البيانات" },
              { title: "Zero Knowledge", desc: "نحن لا نعرف هويتك، النظام يعرف بصمتك فقط" },
              { title: "Quantum Ready", desc: "خوارزميات مقاومة للجيل القادم من الحواسب" }
            ].map((item, idx) => (
              <div key={idx} className="bg-white/5 backdrop-blur-md rounded-[2.5rem] p-10 border border-white/10 hover:bg-white/10 transition-colors">
                <h4 className="text-secondary font-black text-2xl mb-3 tracking-widest italic">{item.title}</h4>
                <p className="text-white/50 text-base font-light">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------- PRICING SECTION -------------------- */}
      <section className="py-40">
        <div className="container mx-auto px-4">
          <div className="text-center mb-32 max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-black tracking-widest uppercase mb-6">
              استثمار ذكي
            </div>
            <h2 className="text-6xl md:text-8xl font-black mb-6 text-white tracking-tighter uppercase">
              باقات <span className="text-secondary text-glow">المستقبل</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-7xl mx-auto items-stretch">
            <div className="relative group glass-card p-14 rounded-[4rem] text-center border-white/5 flex flex-col justify-between">
              <div>
                <h3 className="text-3xl font-black mb-2 text-white italic">BASE</h3>
                <p className="text-white/30 mb-10 text-sm tracking-widest font-bold">للمستكشفين الجدد</p>
                <div className="mb-12">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-8xl font-black text-white">0</span>
                    <span className="text-xl font-bold text-white/20 uppercase tracking-widest">TND</span>
                  </div>
                  <p className="text-[10px] text-secondary font-black mt-4 tracking-[0.3em] uppercase">7 أيام تجربة كاملة</p>
                </div>
                <ul className="space-y-6 mb-12 text-right">
                  <li className="flex items-center gap-4 group/item">
                    <div className="h-6 w-6 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    </div>
                    <span className="text-white/60 font-medium">10 عمليات مسح يومياً</span>
                  </li>
                  <li className="flex items-center gap-4 opacity-30">
                    <div className="h-6 w-6 rounded-lg bg-white/10 flex items-center justify-center">
                      <X className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-white/60 font-medium">دعم فني مخصص</span>
                  </li>
                </ul>
              </div>
              <Link to="/auth">
                <Button variant="ghost" className="w-full h-20 rounded-[2rem] border-2 border-white/10 text-white hover:bg-white/5 text-xl font-black transition-all">
                  ابدأ التجربة
                </Button>
              </Link>
            </div>

            <div className="relative group bg-white p-16 rounded-[4.5rem] text-center shadow-[0_50px_100px_-20px_rgba(251,191,36,0.3)] flex flex-col justify-between scale-110 z-20 border-8 border-[#050B18]">
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-secondary text-primary px-10 py-3 rounded-2xl text-sm font-black tracking-widest uppercase shadow-2xl">
                الاختيار الذكي
              </div>
              <div>
                <h3 className="text-4xl font-black mb-2 text-primary italic underline underline-offset-8 decoration-secondary decoration-4">PRO</h3>
                <p className="text-primary/40 mb-12 text-sm tracking-widest font-black">للمحترفين والطموحين</p>
                <div className="mb-14">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-9xl font-black text-primary leading-none">19</span>
                    <span className="text-2xl font-black text-primary/30 uppercase tracking-tighter">TND</span>
                  </div>
                  <p className="text-[10px] text-primary/20 font-black mt-4 tracking-[0.5em] uppercase">اشتراك شهري</p>
                </div>
                <ul className="space-y-6 mb-14 text-right">
                  <li className="flex items-center gap-4">
                    <div className="h-7 w-7 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                      <CheckCircle2 className="h-5 w-5 text-secondary" />
                    </div>
                    <span className="text-primary font-black text-lg">مسح لا محدود 24/7</span>
                  </li>
                  <li className="flex items-center gap-4">
                    <div className="h-7 w-7 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                      <CheckCircle2 className="h-5 w-5 text-secondary" />
                    </div>
                    <span className="text-primary/70 font-bold">ربط بطاقات دفع متعددة</span>
                  </li>
                </ul>
              </div>
              <Link to="/auth">
                <Button className="w-full h-24 rounded-[2.5rem] bg-primary text-secondary hover:bg-primary/90 transition-all text-2xl font-black shadow-2xl group flex items-center gap-4">
                  اشترك الآن
                  <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform" />
                </Button>
              </Link>
            </div>

            <div className="relative group glass-card p-14 rounded-[4rem] text-center border-white/5 flex flex-col justify-between">
              <div>
                <h3 className="text-3xl font-black mb-2 text-white italic">ULTRA</h3>
                <p className="text-white/30 mb-10 text-sm tracking-widest font-bold">للمؤسسات والشركاء</p>
                <div className="mb-12">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-8xl font-black text-white">49</span>
                    <span className="text-xl font-bold text-white/20 uppercase tracking-widest">TND</span>
                  </div>
                  <p className="text-[10px] text-secondary font-black mt-4 tracking-[0.3em] uppercase">اشتراك مؤسساتي</p>
                </div>
                <ul className="space-y-6 mb-12 text-right">
                  <li className="flex items-center gap-4">
                    <div className="h-6 w-6 rounded-lg bg-secondary/20 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-secondary" />
                    </div>
                    <span className="text-white/60 font-medium">كل مزايا PRO + API</span>
                  </li>
                  <li className="flex items-center gap-4">
                    <div className="h-6 w-6 rounded-lg bg-secondary/20 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-secondary" />
                    </div>
                    <span className="text-white/60 font-medium whitespace-nowrap">إدارة وصول الموظفين</span>
                  </li>
                </ul>
              </div>
              <Link to="/contact">
                <Button variant="ghost" className="w-full h-20 rounded-[2rem] border-2 border-white/10 text-white hover:bg-white/5 text-xl font-black transition-all">
                  تواصل معنا
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- FAQ SECTION -------------------- */}
      <section className="py-40 relative overflow-hidden">
        <div className="absolute top-1/2 -right-48 w-[800px] h-[800px] bg-secondary/5 rounded-full filter blur-[120px]"></div>
        <div className="container mx-auto px-4 max-w-4xl relative z-10">
          <div className="text-center mb-32">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-xs font-black tracking-widest uppercase mb-6">
              استفسارات شائعة
            </div>
            <h2 className="text-6xl md:text-7xl font-black mb-6 text-white tracking-tighter uppercase italic">
              أسئلة <span className="text-secondary text-glow">المستقبل</span>
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-8">
            {[
              { q: "كيف أبدأ التجربة المجانية؟", a: "بمجرد إنشاء حسابك، يتم تفعيل باقة BASE تلقائياً لمدة 7 أيام. لا حاجة لبطاقة بنكية لبدء التجربة." },
              { q: "هل يمكنني إلغاء اشتراكي في أي وقت؟", a: "نعم، حرية الحركة هي مبدأنا. يمكنك إلغاء أو تغيير باقتك في أي ثانية من خلال لوحة التحكم الخاصة بك." },
              { q: "هل بصمتي آمنة تماماً؟", a: "سافانا تعتمد بروتوكول 'الثقة الصفرية'. بصمتك تتحول إلى كود رياضي معقد جداً لا يمكن إعادة بناء صورة الكف منه أبداً." },
              { q: "ما هي الأجهزة المتوافقة؟", a: "نظامنا يعمل على أي هاتف ذكي حديث بكاميرا عالية الدقة، كما نوفر محطات مسح احترافية للمحلات والمباني." }
            ].map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-none">
                <AccordionTrigger className="flex flex-row-reverse justify-between w-full p-10 glass-card rounded-[2.5rem] font-black text-2xl text-white hover:text-secondary transition-all hover:scale-[1.02] hover:no-underline shadow-xl border-white/5 group">
                  <span className="text-right">{faq.q}</span>
                  <ArrowRight className="h-6 w-6 -rotate-45 group-data-[state=open]:rotate-45 transition-transform" />
                </AccordionTrigger>
                <AccordionContent className="p-12 text-white/40 text-xl text-right leading-relaxed font-light">
                  <div className="bg-white/5 p-8 rounded-[2rem] border-r-4 border-secondary mt-2">
                    {faq.a}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* -------------------- FOOTER -------------------- */}
      <footer className="py-24 relative overflow-hidden group">
        <div className="absolute inset-0 bg-primary"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-20">
            <div>
              <h3 className="text-3xl font-black mb-8 text-white italic">SAVANNA</h3>
              <p className="text-white/40 leading-relaxed text-lg font-light">
                نعيد تعريف العلاقة بين الإنسان والآلة من خلال بصمة الكف. الأمان والسرعة في راحة يدك.
              </p>
            </div>

            {[
              { title: "المنصــــة", links: ["ابدأ المسح", "تسجيل الدخول", "لوحة التحكم", "نقطة البيع"] },
              { title: "الدعــــم", links: ["مركز المساعدة", "المطورين", "حالة النظام", "تواصل معنا"] },
              { title: "قانونـــــي", links: ["سياسة الخصوصية", "شروط الاستخدام", "ملفات التعريف", "حقوق البيانات"] }
            ].map((col, idx) => (
              <div key={idx}>
                <h3 className="text-xl font-black mb-8 text-secondary tracking-widest uppercase">{col.title}</h3>
                <ul className="space-y-4">
                  {col.links.map((link, lidx) => (
                    <li key={lidx}>
                      <a href="#" className="text-white/40 hover:text-white transition-colors text-lg font-medium">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-12 flex flex-col md:flex-row justify-between items-center gap-8">
            <p className="text-white/20 font-black tracking-widest text-xs">© 2025 SAVANNA CORP. ALL RIGHTS RESERVED.</p>
            <div className="flex items-center gap-4">
              <span className="text-white/20 text-xs font-black italic">DESIGNED FOR THE FUTURE</span>
              <div className="h-1 w-12 bg-secondary rounded-full"></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
