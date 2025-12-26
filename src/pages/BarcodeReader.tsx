import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import QRScanner from "@/components/QRScanner";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2, Scan } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const BarcodeReader = () => {
  const [autoNavigating, setAutoNavigating] = useState(false);
  const [autoReading, setAutoReading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [createdBarcode, setCreatedBarcode] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        navigate('/auth');
        return;
      }

      // التحقق من وجود باركود تم إنشاؤه
      const savedQr = localStorage.getItem('created_qr');
      if (savedQr) {
        setCreatedBarcode(savedQr);
        // قراءة تلقائية بعد 2 ثانية
        setAutoReading(true);
        setTimeout(() => {
          handleAutoRead(savedQr);
        }, 2000);
      } else {
        // لا يوجد باركود - افتح الكاميرا
        setShowScanner(true);
      }
    })();
  }, [navigate]);

  const handleAutoRead = (code: string) => {
    console.log("⚡ قراءة تلقائية ذكية:", code);

    // التحقق من وجود البصمة في قاعدة البيانات
    checkPalmPrint(code);
  };

  // التحقق من البصمة
  const checkPalmPrint = async (palmHash: string) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast({
          title: '❌ غير مسجل الدخول',
          description: 'يرجى تسجيل الدخول أولاً',
          variant: 'destructive'
        });
        navigate('/auth');
        return;
      }

      // البحث عن البصمة مع التحقق من الحالة - نستخدم qr_code بدلاً من palm_hash
      const { data: palmData, error } = await supabase
        .from('palm_prints')
        .select('*')
        .eq('qr_code', palmHash)
        .eq('status', 'completed') // التحقق من الحالة
        .single();

      if (error || !palmData) {
        toast({
          title: '❌ لا يوجد حساب مرتبط',
          description: 'البصمة غير مسجلة أو غير مفعلة',
          variant: 'destructive'
        });
        return;
      }

      // التحقق من ربط البصمة بحساب المستخدم
      if (palmData.matched_user_id !== user.id) {
        toast({
          title: '❌ البصمة لا تخص هذا الحساب',
          description: 'البصمة مسجلة لحساب آخر',
          variant: 'destructive'
        });
        return;
      }

      // البصمة صحيحة ومرتبطة بالحساب
      setAutoNavigating(true);
      localStorage.setItem('barcode_read', '1');
      localStorage.setItem('scanned_qr', palmHash);

      toast({
        title: '✅ تمت القراءة الذكية!',
        description: 'البصمة مطابقة ومرتبطة بحسابك',
        duration: 2000,
      });

      setTimeout(() => navigate('/dashboard'), 1500);

    } catch (err) {
      console.error('خطأ في التحقق من البصمة:', err);
      toast({
        title: '❌ خطأ في التحقق',
        description: 'حدث خطأ أثناء التحقق من البصمة',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen mesh-bg py-20 px-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] animate-blob"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>

      <div className="container mx-auto max-w-3xl relative z-10">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-8 text-white/60 hover:text-white hover:bg-white/5 rounded-2xl transition-all font-bold tracking-widest uppercase text-xs"
        >
          <div className="flex items-center gap-2">
            <span>العودة للرئيسية</span>
          </div>
        </Button>

        <div className="glass-card rounded-[3rem] border-white/10 overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
          {/* Header Section */}
          <div className="p-10 md:p-12 text-center border-b border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-1 bg-gradient-to-r from-transparent via-secondary/40 to-transparent"></div>

            <div className="inline-flex items-center justify-center w-24 h-24 mb-8 rounded-3xl bg-gradient-to-br from-secondary/20 to-primary/20 backdrop-blur-xl border border-white/10 shadow-2xl animate-float">
              {autoReading ? (
                <Loader2 className="h-10 w-10 text-secondary animate-spin" />
              ) : (
                <Scan className="h-10 w-10 text-secondary" />
              )}
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
              نظام <span className="text-secondary text-glow">التدقيق</span> الذكي
            </h1>
            <p className="text-lg text-white/50 font-light max-w-md mx-auto leading-relaxed">
              {autoReading
                ? "نظام التوثيق السريع قيد العمل. جاري مطابقة رمزك البيومتري مع السجلات المركزية."
                : "جاهز للمصادقة؟ قم بتوجيه الرمز أمام العدسة ليقوم النظام بالتحقق الفوري."}
            </p>
          </div>

          <CardContent className="p-0 relative">
            {/* Intelligent Reading State */}
            {autoReading && createdBarcode && (
              <div className="p-12 text-center space-y-12">
                {!autoNavigating ? (
                  <div className="space-y-8">
                    <div className="relative inline-block">
                      <div className="h-40 w-40 mx-auto rounded-full bg-secondary/5 border-4 border-dashed border-secondary/20 flex items-center justify-center animate-spin-slow"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-24 w-24 bg-gradient-to-br from-secondary/30 to-primary/20 rounded-full flex items-center justify-center animate-pulse">
                          <Loader2 className="h-12 w-12 text-secondary animate-spin" />
                        </div>
                      </div>
                      <div className="absolute -inset-4 bg-secondary/5 rounded-full animate-ping opacity-10"></div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-3xl font-black text-white">جاري المصادقة الرقمية</p>
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-secondary animate-pulse"></div>
                        <p className="text-white/40 font-bold uppercase tracking-widest text-xs">
                          الرمز المكتشف: {createdBarcode.substring(0, 12)}...
                        </p>
                      </div>
                    </div>

                    <div className="w-full max-w-sm mx-auto h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div className="h-full bg-secondary shadow-[0_0_15px_rgba(251,191,36,0.5)] animate-shimmer-progress"></div>
                    </div>
                  </div>
                ) : (
                  <div className="animate-in zoom-in duration-500 space-y-8 py-8">
                    <div className="w-32 h-32 mx-auto bg-green-500/20 rounded-full border-4 border-green-500/50 flex items-center justify-center">
                      <CheckCircle2 className="h-16 w-16 text-green-500 animate-bounce" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-4xl font-black text-white">اكتمل التوثيق</h2>
                      <p className="text-white/50 text-lg font-light">بصمتك مطابقة بنسبة 100%. مرحباً بك.</p>
                    </div>
                    <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 font-bold text-sm tracking-widest uppercase">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      جاري التحويل الآمن
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Manual Camera State */}
            {showScanner && !autoReading && (
              <div className="relative group overflow-hidden">
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10 pointer-events-none group-hover:opacity-0 transition-opacity duration-700"></div>
                <QRScanner
                  autoStart={true}
                  onScanSuccess={checkPalmPrint}
                />

                {autoNavigating && (
                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
                    <div className="text-center space-y-8 scale-110">
                      <div className="w-24 h-24 mx-auto bg-green-500 rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(34,197,94,0.3)] rotate-12 transition-transform animate-bounce">
                        <CheckCircle2 className="h-12 w-12 text-white" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-4xl font-black text-white uppercase tracking-tighter">بصمة صالحة</p>
                        <p className="text-white/40 font-bold tracking-widest uppercase text-xs">جاري تهيئة النظام</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </div>

        {/* Footer Actions */}
        {showScanner && !autoNavigating && (
          <div className="mt-12 text-center animate-in fade-in slide-in-from-top-4 duration-1000">
            <p className="text-white/30 font-bold tracking-widest uppercase text-xs mb-6">هل تواجه مشكلة؟</p>
            <Button
              onClick={() => navigate('/scanner')}
              size="lg"
              className="h-16 px-12 bg-white/5 border border-white/10 text-white hover:bg-secondary hover:text-primary hover:border-secondary hover:scale-105 transition-all duration-500 font-black rounded-2xl shadow-2xl"
            >
              <Scan className="ml-3 h-6 w-6" />
              إنشاء بصمة جديدة 👋
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeReader;