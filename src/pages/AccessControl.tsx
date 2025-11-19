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
    .eq("palm_hash", hash)
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
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
      }
    })();
  }, [navigate, toast]);

  // 🖐️ مسح البصمة
  const simulatePalmScan = async () => {
    setScanning(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const { data: palmPrints, error } = await supabase
        .from("palm_prints")
        .select("palm_hash")
        .eq("status", "completed")
        .limit(1);

      if (error) throw error;

      if (palmPrints && palmPrints.length > 0) {
        setPalmHash(palmPrints[0].palm_hash);
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
      if (!palmPrint.matched_user_id || palmPrint.matched_user_id === "null") {
        throw new Error("هذه البصمة غير مرتبطة بأي مستخدم.");
      }

      const profile = await fetchUserProfile(palmPrint.matched_user_id);
      if (!profile || !profile.user_id || profile.user_id === "null") {
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
          <Button variant="default" disabled className="justify-start">1) إنشاء حساب</Button>
          <Button variant="default" className="justify-start" onClick={() => navigate('/scanner')}>2) إنشاء الباركود</Button>
          <Button variant="default" className="justify-start" onClick={() => navigate('/barcode')}>3) قراءة الباركود</Button>
          <Button variant="default" className="justify-start" onClick={() => navigate('/dashboard')}>4) إكمال الملف</Button>
          <Button variant="default" disabled className="justify-start">5) البدء بالاستخدام</Button>
        </div>
        <Button variant="outline" onClick={() => navigate("/")} className="mb-6">
          العودة للرئيسية
        </Button>

        <Card className="shadow-lg border-2 border-primary/10">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <Scan className="h-6 w-6 text-primary" />
              <CardTitle className="text-3xl">نظام التحكم بالدخول</CardTitle>
            </div>
            <CardDescription>نظام الدخول والخروج بالبصمة الحيوية</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* واجهة الحالات */}
            {accessStatus === "idle" && (
              <>
                <div className="space-y-4">
                  <Button
                    onClick={simulatePalmScan}
                    disabled={scanning}
                    className="w-full h-16 text-lg"
                    variant={palmHash ? "secondary" : "default"}
                  >
                    {scanning ? (
                      <>
                        <Loader2 className="ml-2 h-5 w-5 animate-spin" /> جاري المسح...
                      </>
                    ) : palmHash ? (
                      <>
                        <Check className="ml-2 h-5 w-5" /> تم المسح
                      </>
                    ) : (
                      <>
                        <Scan className="ml-2 h-5 w-5" /> مسح بصمة الكف
                      </>
                    )}
                  </Button>

                  {palmHash && (
                    <Badge variant="outline" className="w-full justify-center py-2">
                      {palmHash}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => processAccess("entry")}
                    disabled={!palmHash || processing}
                    className="h-24 text-lg flex-col gap-2"
                  >
                    <LogIn className="h-8 w-8" /> دخول
                  </Button>
                  <Button
                    onClick={() => processAccess("exit")}
                    disabled={!palmHash || processing}
                    className="h-24 text-lg flex-col gap-2"
                    variant="secondary"
                  >
                    <LogOut className="h-8 w-8" /> خروج
                  </Button>
                </div>
              </>
            )}

            {accessStatus === "granted" && (
              <div className="text-center py-12 space-y-4">
                <div className="mx-auto w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  {accessType === "entry" ? (
                    <LogIn className="h-10 w-10 text-green-600 dark:text-green-400" />
                  ) : (
                    <LogOut className="h-10 w-10 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">
                  تم منح {accessType === "entry" ? "الدخول" : "الخروج"}
                </h3>
                <p className="text-muted-foreground text-lg">مرحباً، {userName}</p>
              </div>
            )}

            {accessStatus === "denied" && (
              <div className="text-center py-12 space-y-4">
                <div className="mx-auto w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <X className="h-10 w-10 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">
                  تم رفض الوصول
                </h3>
                <p className="text-muted-foreground">بصمة الكف غير مسجلة في النظام.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccessControl;
