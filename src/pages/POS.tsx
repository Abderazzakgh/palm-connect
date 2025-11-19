import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CreditCard, Check, X, Scan } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";

const POS = () => {
  const [amount, setAmount] = useState("");
  const [palmHash, setPalmHash] = useState("");
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'failed'>('idle');
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

  const simulatePalmScan = async () => {
    setScanning(true);
    try {
      // Simulate scanning process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to find a completed palm print to simulate
      // In production, this would come from the actual scanner device
      const { data: palmPrints } = await supabase
        .from('palm_prints')
        .select('palm_hash')
        .eq('status', 'completed')
        .limit(1);
      
      if (palmPrints && palmPrints.length > 0) {
        setPalmHash(palmPrints[0].palm_hash);
        toast({
          title: "تم المسح بنجاح",
          description: "تم التعرف على بصمة الكف",
        });
      } else {
        // Fallback: generate a test hash (for demo purposes)
        const hash = `PALM-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        setPalmHash(hash);
        toast({
          title: "تم المسح (تجريبي)",
          description: "في الإنتاج، سيتم الحصول على البصمة من الجهاز الفعلي",
        });
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "حدث خطأ أثناء المسح";
      toast({ title: "خطأ في المسح", description: msg, variant: "destructive" });
    } finally {
      setScanning(false);
    }
  };

  const processPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال مبلغ صحيح",
        variant: "destructive",
      });
      return;
    }

    if (!palmHash) {
      toast({
        title: "خطأ",
        description: "يرجى مسح بصمة الكف أولاً",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    try {
      // Find palm print by palm_hash or matched_user_id
      let palmPrint = null;
      const query = supabase
        .from('palm_prints')
        .select('id, matched_user_id')
        .eq('status', 'completed');
      
      // Try matching by palm_hash first
      const { data: hashMatch, error: hashError } = await query
        .eq('palm_hash', palmHash)
        .maybeSingle();
      
      if (!hashError && hashMatch) {
        palmPrint = hashMatch;
      } else {
        // Try matching by matched_user_id if palmHash is actually a user ID
        const { data: userMatch, error: userError } = await supabase
          .from('palm_prints')
          .select('id, matched_user_id')
          .eq('status', 'completed')
          .eq('matched_user_id', palmHash)
          .maybeSingle();
        
        if (!userError && userMatch) {
          palmPrint = userMatch;
        }
      }

      if (!palmPrint) {
        throw new Error('بصمة الكف غير مسجلة أو غير مفعّلة');
      }

      // Find user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, bank_name')
        .eq('palm_print_id', palmPrint.id)
        .maybeSingle();

      if (profileError || !profile) {
        throw new Error('لم يتم العثور على حساب مرتبط');
      }

      // Create transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: profile.user_id,
          transaction_type: 'payment',
          amount: parseFloat(amount),
          currency: 'SAR',
          status: 'completed',
          location: 'نقطة البيع - المحل التجاري',
          device_id: 'POS-001',
          metadata: {
            payment_method: 'palm_biometric',
            bank: profile.bank_name,
          }
        });

      if (transactionError) throw transactionError;

      setPaymentStatus('success');
      toast({
        title: "تمت العملية بنجاح",
        description: `تم خصم ${amount} ريال من حساب ${profile.full_name}`,
      });

      setTimeout(() => {
        setAmount("");
        setPalmHash("");
        setPaymentStatus('idle');
      }, 3000);

    } catch (error: unknown) {
      setPaymentStatus('failed');
      const msg = error instanceof Error ? error.message : 'حدث خطأ أثناء معالجة الدفع';
      toast({ title: "فشلت العملية", description: msg, variant: "destructive" });

      setTimeout(() => {
        setPaymentStatus('idle');
      }, 3000);
    } finally {
      setProcessing(false);
    }
  };

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
        <Button 
          variant="outline" 
          onClick={() => navigate('/')}
          className="mb-6"
        >
          العودة للرئيسية
        </Button>

        <Card className="shadow-lg border-2 border-primary/10">
          <CardHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <CreditCard className="h-6 w-6 text-primary" />
              <CardTitle className="text-3xl">نقطة البيع - POS</CardTitle>
            </div>
            <CardDescription>
              نظام الدفع بالبصمة الحيوية
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {paymentStatus === 'idle' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="amount">المبلغ (ريال)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-2xl font-bold h-14"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="space-y-4">
                  <Label>بصمة الكف</Label>
                  <div className="flex gap-2">
                    <Button
                      onClick={simulatePalmScan}
                      disabled={scanning}
                      className="flex-1"
                      variant={palmHash ? "secondary" : "default"}
                    >
                      {scanning ? (
                        <>
                          <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                          جاري المسح...
                        </>
                      ) : palmHash ? (
                        <>
                          <Check className="ml-2 h-4 w-4" />
                          تم المسح
                        </>
                      ) : (
                        <>
                          <Scan className="ml-2 h-4 w-4" />
                          مسح بصمة الكف
                        </>
                      )}
                    </Button>
                  </div>
                  {palmHash && (
                    <Badge variant="outline" className="w-full justify-center py-2">
                      {palmHash}
                    </Badge>
                  )}
                </div>

                <Button
                  onClick={processPayment}
                  disabled={!amount || !palmHash || processing}
                  className="w-full h-14 text-lg"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                      جاري المعالجة...
                    </>
                  ) : (
                    <>
                      <CreditCard className="ml-2 h-5 w-5" />
                      تنفيذ عملية الدفع
                    </>
                  )}
                </Button>
              </>
            )}

            {paymentStatus === 'success' && (
              <div className="text-center py-12 space-y-4">
                <div className="mx-auto w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                  <Check className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">
                  تمت العملية بنجاح
                </h3>
                <p className="text-muted-foreground">
                  تم خصم {amount} ريال من الحساب
                </p>
              </div>
            )}

            {paymentStatus === 'failed' && (
              <div className="text-center py-12 space-y-4">
                <div className="mx-auto w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <X className="h-10 w-10 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">
                  فشلت العملية
                </h3>
                <p className="text-muted-foreground">
                  يرجى المحاولة مرة أخرى
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default POS;
