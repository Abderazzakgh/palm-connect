import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, LogIn, LogOut, Scan, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";
import { Label } from "@/components/ui/label";

type AccessType = "entry" | "exit";
type AccessStatus = "idle" | "granted" | "denied";

// 🔹 جلب بيانات البصمة
const fetchPalmPrint = async (hash: string) => {
  const { data, error } = await supabase
    .from("palm_prints")
    .select("id, matched_user_id")
    .eq("status", "completed")
    .eq("qr_code", hash)  // استخدام qr_code بدلاً من palm_hash
    .maybeSingle();

  if (error) throw error;
  return data;
};

// 🔹 جلب البروفايل
const fetchUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id, full_name")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

// 🔹 تسجيل المعاملة (مع إصلاح UUID)
const logTransaction = async (userId: string, type: AccessType) => {
  if (!userId || userId === "null" || userId.trim() === "") {
    throw new Error("User ID غير صالح — لا يمكن تسجيل العملية.");
  }

  const { error } = await supabase.from("transactions").insert({
    user_id: userId,
    transaction_type: type === "entry" ? "access_entry" : "access_exit",
    status: "completed",
    location: "المبنى الرئيسي - البوابة الأمامية",
    device_id: "ACCESS-001",
    metadata: { access_method: "palm_biometric", access_granted: true },
  });

  if (error) throw error;
};

const AccessControl = () => {
  const [palmHash, setPalmHash] = useState("");
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [accessStatus, setAccessStatus] = useState<AccessStatus>("idle");
  const [userName, setUserName] = useState("");
  const [accessType, setAccessType] = useState<AccessType | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        navigate('/auth');
        return;
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*, palm_prints(*)')
        .eq('user_id', user.id)
        .maybeSingle();

      const prof = profile as unknown as (Tables<'user_profiles'> & { palm_prints?: Tables<'palm_prints'>[] }) | null;
      const hasPalmLinked = !!prof?.palm_print_id || ((prof?.palm_prints?.length ?? 0) > 0);
      const hasBankInfo = !!prof?.atm_card_last_4 && !!prof?.bank_name;

      if (!hasPalmLinked) {
        toast({ title: 'أكمل المرحلة السابقة', description: 'يجب ربط بصمة الكف أولاً', variant: 'destructive' });
        navigate('/scanner');
        return;
      }
      if (!hasBankInfo) {
        toast({ title: 'أكمل بياناتك', description: 'يرجى إكمال معلوماتك الشخصية والبنكية', variant: 'destructive' });
        navigate('/dashboard');
      } else {
        // إذا كانت جميع البيانات مكتملة، يمكن للمستخدم استخدام النظام
        // لا نقوم بأي توجيه إضافي
      }
    })();
  }, [navigate, toast]);

  // 🖐️ مسح البصمة
  const simulatePalmScan = async () => {
    setScanning(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // استخدام القيمة المحفوظة في localStorage من Scanner
      const savedQr = localStorage.getItem('created_qr');
      if (savedQr) {
        setPalmHash(savedQr);
        toast({
          title: "تم المسح بنجاح",
          description: "تم التعرف على بصمة الكف.",
        });
      } else {
        // إذا لم تكن هناك قيمة محفوظة، نبحث في قاعدة البيانات
        const { data: palmPrints, error } = await supabase
          .from("palm_prints")
          .select("qr_code")  // استخدام qr_code بدلاً من palm_hash
          .eq("status", "completed")
          .limit(1);

        if (error) throw error;

        if (palmPrints && palmPrints.length > 0) {
          setPalmHash(palmPrints[0].qr_code);  // استخدام qr_code بدلاً من palm_hash
          toast({
            title: "تم المسح بنجاح",
            description: "تم التعرف على بصمة الكف.",
          });
        } else {
          const hash = `PALM-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          setPalmHash(hash);
          toast({
            title: "تم المسح (تجريبي)",
            description: "في الإصدار الفعلي سيتم الحصول على البصمة من الجهاز.",
          });
        }
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "حدث خطأ غير متوقع.";
      toast({ title: "خطأ أثناء المسح", description: msg, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  // 🚪 المعالجة
  const processAccess = async (type: AccessType) => {
    if (!palmHash) {
      toast({
        title: "خطأ",
        description: "يرجى مسح بصمة الكف أولاً.",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    setAccessType(type);

    try {
      // 1️⃣ جلب البصمة المطابقة
      const palmPrint = await fetchPalmPrint(palmHash);
      if (!palmPrint) throw new Error("بصمة الكف غير مسجلة أو غير مفعلة.");

      // 2️⃣ التحقق من matched_user_id
      if (!palmPrint.matched_user_id || palmPrint.matched_user_id === "null" || palmPrint.matched_user_id === "") {
        throw new Error("هذه البصمة غير مرتبطة بأي مستخدم.");
      }

      const profile = await fetchUserProfile(palmPrint.matched_user_id);
      if (!profile || !profile.user_id || profile.user_id === "null" || profile.user_id === "") {
        throw new Error("الملف الشخصي غير مكتمل ولا يحتوي على User ID صالح.");
      }

      // 3️⃣ تسجيل المعاملة (UUID صالح الآن)
      await logTransaction(profile.user_id, type);

      // 4️⃣ نجاح العملية
      setAccessStatus("granted");
      setUserName(profile.full_name);

      toast({
        title: "تم منح الوصول",
        description: `${type === "entry" ? "دخول" : "خروج"} ${profile.full_name}`,
      });

      setTimeout(() => {
        setPalmHash("");
        setAccessStatus("idle");
        setAccessType(null);
        setUserName("");
      }, 3000);
    } catch (error: unknown) {
      setAccessStatus("denied");
      const msg = error instanceof Error ? error.message : "بصمة الكف غير مسجلة.";
      toast({ title: "تم رفض الوصول", description: msg, variant: "destructive" });

      setTimeout(() => {
        setAccessStatus("idle");
        setAccessType(null);
      }, 3000);
    } finally {
      setProcessing(false);
    }
  };

  // 🧩 UI
  return (
    <div className="min-h-screen mesh-bg py-20 px-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] animate-blob"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>

      <div className="container mx-auto max-w-4xl relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-white/60 hover:text-white hover:bg-white/5 rounded-2xl transition-all font-bold tracking-widest uppercase text-xs"
          >
            العودة للرئيسية
          </Button>

          <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl backdrop-blur-md border border-white/5">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-all duration-500 ${s <= 3 ? "bg-secondary text-primary shadow-lg shadow-secondary/20" : "bg-white/10 text-white/20"
                  }`}
              >
                {s}
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-stretch">
          {/* Left Side: Portal Info */}
          <div className="relative glass-card p-10 rounded-[3rem] border-white/10 flex flex-col justify-between overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-secondary/40 to-transparent"></div>

            <div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center mb-8 border border-white/10 animate-float">
                <Scan className="h-8 w-8 text-secondary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight leading-tight">
                بوابة <span className="text-secondary text-glow">العبور</span> الذكي
              </h1>
              <p className="text-white/40 text-lg font-light leading-relaxed mb-8 text-right">
                تحكم كامل في الدخول والخروج باستخدام تقنية التعرف على الكف. الربط الفوري مع السجلات الأمنية المركزية.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4 group-hover:bg-white/10 transition-colors">
                <div className="h-4 w-4 rounded-full bg-secondary animate-pulse"></div>
                <div>
                  <p className="text-white font-bold text-sm">البوابة الأمامية متصلة</p>
                  <p className="text-white/30 text-xs uppercase tracking-widest">المعرف: GATE-77-ALPHA</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Access Logic */}
          <div className="glass-card rounded-[3rem] border-white/10 overflow-hidden shadow-2xl">
            <CardContent className="p-10 md:p-12 space-y-12">
              {accessStatus === "idle" && (
                <>
                  <div className="space-y-6">
                    <Label className="text-white/50 font-bold uppercase tracking-[0.2em] text-[10px] mr-1">المصادقة البيومترية</Label>
                    <Button
                      onClick={simulatePalmScan}
                      disabled={scanning}
                      className={`w-full h-24 rounded-[2rem] transition-all duration-700 font-black text-xl group relative overflow-hidden ${palmHash
                        ? "bg-secondary text-primary shadow-[0_0_30px_rgba(251,191,36,0.3)]"
                        : "bg-white/5 text-white border-2 border-white/10 hover:border-secondary/50"
                        }`}
                    >
                      <div className="relative z-10 flex items-center justify-center gap-4">
                        {scanning ? (
                          <>
                            <Loader2 className="h-6 w-6 animate-spin" />
                            جاري فحص البصمة...
                          </>
                        ) : palmHash ? (
                          <>
                            <Check className="h-6 w-6" />
                            بصمة مفعّلـــــة
                          </>
                        ) : (
                          <>
                            <Scan className="h-6 w-6 group-hover:scale-110 transition-transform" />
                            مسح كف اليـــــد
                          </>
                        )}
                      </div>
                      {!palmHash && !scanning && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                      )}
                    </Button>

                    {palmHash && (
                      <div className="p-4 rounded-xl bg-secondary/5 border border-secondary/10 text-center animate-in fade-in zoom-in duration-500">
                        <span className="text-[10px] font-black text-secondary/60 uppercase tracking-widest font-mono">{palmHash}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <Button
                      onClick={() => processAccess("entry")}
                      disabled={!palmHash || processing}
                      className="h-32 rounded-[2rem] flex-col gap-3 bg-white/5 border border-white/10 text-white hover:bg-green-500 hover:text-white hover:border-green-500 transition-all duration-500 group"
                    >
                      <LogIn className="h-10 w-10 group-hover:scale-125 transition-transform" />
                      <span className="font-black uppercase tracking-widest text-sm text-right">تسجيل دخول</span>
                    </Button>
                    <Button
                      onClick={() => processAccess("exit")}
                      disabled={!palmHash || processing}
                      className="h-32 rounded-[2rem] flex-col gap-3 bg-white/5 border border-white/10 text-white hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-500 group"
                    >
                      <LogOut className="h-10 w-10 group-hover:scale-125 transition-transform" />
                      <span className="font-black uppercase tracking-widest text-sm text-right">تسجيل خروج</span>
                    </Button>
                  </div>
                </>
              )}

              {accessStatus === "granted" && (
                <div className="text-center py-16 space-y-10 animate-in zoom-in duration-700">
                  <div className="relative inline-block">
                    <div className="w-32 h-32 rounded-3xl bg-green-500 flex items-center justify-center shadow-[0_0_50px_rgba(34,197,94,0.4)] rotate-12 transition-transform animate-bounce">
                      {accessType === "entry" ? (
                        <LogIn className="h-16 w-16 text-white" />
                      ) : (
                        <LogOut className="h-16 w-16 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-4xl font-black text-white italic">
                      تم منح {accessType === "entry" ? "الدخول" : "الخروج"}
                    </h3>
                    <p className="text-white/40 text-xl font-light">مرحباً بك، <span className="text-secondary font-bold">{userName}</span></p>
                  </div>
                  <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 font-bold text-xs tracking-widest uppercase">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    جاري تهيئة البوابة
                  </div>
                </div>
              )}

              {accessStatus === "denied" && (
                <div className="text-center py-16 space-y-10 animate-in shake duration-500">
                  <div className="w-32 h-32 mx-auto rounded-3xl bg-red-500 flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.4)]">
                    <X className="h-16 w-16 text-white" />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-4xl font-black text-white">تم تم رفض العبور</h3>
                    <p className="text-white/40 text-xl font-light text-right">عذراً، البصمة غير معرفة في السجلات المركزية.</p>
                  </div>
                  <Button
                    onClick={() => setAccessStatus('idle')}
                    className="h-14 px-8 bg-white/5 text-white hover:bg-white/10 rounded-2xl"
                  >
                    محاولة مرة أخرى
                  </Button>
                </div>
              )}
            </CardContent>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccessControl;
