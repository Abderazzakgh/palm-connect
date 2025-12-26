import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import QRScanner from "@/components/QRScanner";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <Button variant="outline" onClick={() => navigate("/")} className="mb-6 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span>العودة للرئيسية</span>
          </div>
        </Button>

        {/* حالة القراءة التلقائية الذكية */}
        {autoReading && createdBarcode && (
          <Card className="shadow-2xl border-2 border-secondary overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-transparent to-primary/5"></div>
            <CardHeader className="bg-gradient-to-r from-secondary to-secondary/80 text-primary pb-8 relative z-10">
              <CardTitle className="text-3xl flex items-center gap-4">
                <div className="h-14 w-14 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">⚡</span>
                </div>
                قراءة ذكية تلقائية
              </CardTitle>
              <CardDescription className="text-primary/80 text-lg mt-2">
                تم العثور على باركود تم إنشاؤه مسبقاً - جاري الربط التلقائي...
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 relative z-10">
              {!autoNavigating ? (
                <div className="text-center space-y-6">
                  <div className="relative">
                    <div className="h-24 w-24 mx-auto bg-gradient-to-br from-secondary/30 to-primary/20 rounded-full flex items-center justify-center">
                      <Loader2 className="h-12 w-12 text-secondary animate-spin" />
                    </div>
                    <div className="absolute inset-0 h-24 w-24 mx-auto bg-secondary/20 rounded-full animate-ping opacity-20"></div>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-primary mb-2">🤖 جاري القراءة الذكية...</p>
                    <p className="text-sm text-muted-foreground">الباركود: {createdBarcode.substring(0, 20)}...</p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-6">
                  <div className="h-24 w-24 mx-auto bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center animate-bounce">
                    <CheckCircle2 className="h-12 w-12 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600 mb-2">✅ تم الربط بنجاح!</p>
                    <p className="text-muted-foreground">جاري الانتقال إلى لوحة التحكم...</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* حالة الكاميرا (لا يوجد باركود مسبق) */}
        {showScanner && !autoReading && (
          <Card className="shadow-2xl border-2 border-primary/20 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5"></div>
            <CardHeader className="bg-gradient-to-r from-primary to-primary/80 text-white pb-8 relative z-10">
              <CardTitle className="text-3xl flex items-center gap-4">
                <div className="h-14 w-14 bg-gradient-to-br from-secondary to-primary rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">📸</span>
                </div>
                قارئ الباركود الذكي
              </CardTitle>
              <CardDescription className="text-white/90 text-lg mt-2">
                لم يتم العثور على بصمة - استخدم الكاميرا لمسح بصمة الكف
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 relative z-10">
              <QRScanner
                autoStart={true}
                onScanSuccess={checkPalmPrint}
                
              />

              {autoNavigating && (
                <div className="p-8 text-center bg-gradient-to-br from-green-500/20 to-secondary/20">
                  <div className="flex items-center justify-center mb-4">
                    <div className="h-16 w-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center animate-bounce">
                      <CheckCircle2 className="h-10 w-10 text-white" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-green-600 mb-2">✅ تمت القراءة!</p>
                  <p className="text-muted-foreground">جاري الانتقال...</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* زر الانتقال لإنشاء باركود */}
        {showScanner && !autoNavigating && (
          <div className="mt-6 text-center">
            <p className="text-muted-foreground mb-3">لا توجد بصمة؟</p>
            <Button 
              onClick={() => navigate('/scanner')} 
              size="lg" 
              className="bg-gradient-to-r from-secondary to-primary text-white hover:opacity-90 px-8"
            >
              <div className="flex items-center gap-2">
                <span>📸 إنشاء بصمة جديدة</span>
              </div>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeReader;