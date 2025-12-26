import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, LogIn, LogOut, Scan, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="grid gap-2 mb-6 md:grid-cols-5">
          <Button variant="default" disabled className="justify-start bg-primary/20 hover:bg-primary/30">
            <span className="flex items-center gap-1">
              1) إنشاء حساب
            </span>
          </Button>
          <Button variant="default" className="justify-start bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90" onClick={() => navigate('/scanner')}>
            <span className="flex items-center gap-1">
              2) إنشاء الباركود
            </span>
          </Button>
          <Button variant="default" className="justify-start bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90" onClick={() => navigate('/barcode')}>
            <span className="flex items-center gap-1">
              3) قراءة الباركود
            </span>
          </Button>
          <Button variant="default" className="justify-start bg-gradient-to-r from-secondary to-primary text-white hover:opacity-90" onClick={() => navigate('/dashboard')}>
            <span className="flex items-center gap-1">
              4) إكمال الملف
            </span>
          </Button>
          <Button variant="default" disabled className="justify-start bg-primary/20 hover:bg-primary/30">
            <span className="flex items-center gap-1">
              5) البدء بالاستخدام
            </span>
          </Button>
        </div>
        <Button variant="outline" onClick={() => navigate("/")} className="mb-6 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span>العودة للرئيسية</span>
          </div>
        </Button>

        <Card className="shadow-2xl border-2 border-primary/20 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5"></div>
          <CardHeader className="space-y-1 relative z-10 pb-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg">
                <Scan className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  نظام التحكم بالدخول
                </CardTitle>
                <CardDescription className="text-lg mt-1">
                  نظام الدخول والخروج بالبصمة الحيوية
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 relative z-10 pb-8">
            {/* واجهة الحالات */}
            {accessStatus === "idle" && (
              <>
                <div className="space-y-4">
                  <Button
                    onClick={simulatePalmScan}
                    disabled={scanning}
                    className="w-full h-16 text-lg bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90"
                    variant={palmHash ? "secondary" : "default"}
                  >
                    {scanning ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="ml-2 h-5 w-5 animate-spin" /> جاري المسح...
                      </div>
                    ) : palmHash ? (
                      <div className="flex items-center gap-2">
                        <Check className="ml-2 h-5 w-5" /> تم المسح
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Scan className="ml-2 h-5 w-5" /> مسح بصمة الكف
                      </div>
                    )}
                  </Button>

                  {palmHash && (
                    <div className="bg-card/50 backdrop-blur-sm p-4 rounded-xl border border-primary/20">
                      <div className="text-center font-mono text-sm break-all p-2 bg-primary/5 rounded-lg">
                        {palmHash}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => processAccess("entry")}
                    disabled={!palmHash || processing}
                    className="h-24 text-lg flex-col gap-2 bg-gradient-to-br from-green-500 to-green-600 hover:opacity-90 text-white"
                  >
                    <LogIn className="h-8 w-8" /> دخول
                  </Button>
                  <Button
                    onClick={() => processAccess("exit")}
                    disabled={!palmHash || processing}
                    className="h-24 text-lg flex-col gap-2 bg-gradient-to-br from-red-500 to-red-600 hover:opacity-90 text-white"
                    variant="secondary"
                  >
                    <LogOut className="h-8 w-8" /> خروج
                  </Button>
                </div>
              </>
            )}

            {accessStatus === "granted" && (
              <div className="text-center py-12 space-y-6">
                <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                  {accessType === "entry" ? (
                    <LogIn className="h-12 w-12 text-white" />
                  ) : (
                    <LogOut className="h-12 w-12 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-green-600 mb-2">
                    ✅ تم منح {accessType === "entry" ? "الدخول" : "الخروج"}
                  </h3>
                  <p className="text-xl text-muted-foreground">مرحباً، <span className="font-semibold text-primary">{userName}</span></p>
                </div>
              </div>
            )}

            {accessStatus === "denied" && (
              <div className="text-center py-12 space-y-6">
                <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg">
                  <X className="h-12 w-12 text-white" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-red-600 mb-2">
                    ❌ تم رفض الوصول
                  </h3>
                  <p className="text-xl text-muted-foreground">بصمة الكف غير مسجلة في النظام.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccessControl;
