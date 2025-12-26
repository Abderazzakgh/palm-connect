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

      // Find user profile - attempt to match by palm_print_id OR directly by user_id if available
      let profileQuery = supabase
        .from('user_profiles')
        .select('user_id, full_name, bank_name');

      if (palmPrint.matched_user_id) {
        profileQuery = profileQuery.or(`palm_print_id.eq.${palmPrint.id},user_id.eq.${palmPrint.matched_user_id}`);
      } else {
        profileQuery = profileQuery.eq('palm_print_id', palmPrint.id);
      }

      const { data: profile, error: profileError } = await profileQuery.maybeSingle();

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
    <div className="min-h-screen mesh-bg py-20 px-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] animate-blob"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>

      <div className="container mx-auto max-w-4xl relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-white/60 hover:text-white hover:bg-white/5 rounded-2xl transition-all font-bold tracking-widest uppercase text-xs"
          >
            العودة للرئيسية
          </Button>

          <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl backdrop-blur-md border border-white/5">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-all duration-500 ${s <= 4 ? "bg-secondary text-primary shadow-lg shadow-secondary/20" : "bg-white/10 text-white/20"
                  }`}
              >
                {s}
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-stretch">
          {/* Left Side: Terminals Info */}
          <div className="relative glass-card p-10 rounded-[3rem] border-white/10 flex flex-col justify-between overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-secondary/40 to-transparent"></div>

            <div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary/20 to-primary/20 flex items-center justify-center mb-8 border border-white/10 animate-float">
                <CreditCard className="h-8 w-8 text-secondary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight leading-tight">
                محطة <span className="text-secondary text-glow">الدفع</span> البيومترية
              </h1>
              <p className="text-white/40 text-lg font-light leading-relaxed mb-8">
                نظام الدفع المستقبلي المعتمد على بصمة الكف. سرعة، أمان، وسهولة تامة في كل معاملة.
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-6 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-4 group-hover:bg-white/10 transition-colors">
                <div className="h-4 w-4 rounded-full bg-green-500 animate-pulse"></div>
                <div>
                  <p className="text-white font-bold text-sm">نقطة البيع متصلة</p>
                  <p className="text-white/30 text-xs uppercase tracking-widest">المعرف: POS-092-DELTA</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side: Payment Logic */}
          <div className="glass-card rounded-[3rem] border-white/10 overflow-hidden shadow-2xl">
            <CardContent className="p-10 md:p-12 space-y-8">
              {paymentStatus === 'idle' && (
                <>
                  <div className="space-y-4">
                    <Label className="text-white/50 font-bold uppercase tracking-[0.2em] text-[10px] mr-1">المبلغ المطلوب</Label>
                    <div className="relative group">
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-secondary">SAR</div>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="text-5xl font-black h-24 bg-white/5 border-white/10 text-white rounded-[2rem] pl-20 pr-8 focus:ring-secondary/30 focus:border-secondary transition-all"
                        step="0.01"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-white/50 font-bold uppercase tracking-[0.2em] text-[10px] mr-1">المصادقة البيومترية</Label>
                    <Button
                      onClick={simulatePalmScan}
                      disabled={scanning}
                      className={`w-full h-20 rounded-[2rem] transition-all duration-700 font-black text-xl group relative overflow-hidden ${palmHash
                        ? "bg-green-500/20 text-green-400 border-2 border-green-500/30"
                        : "bg-white/5 text-white border-2 border-white/10 hover:border-secondary/50"
                        }`}
                    >
                      <div className="relative z-10 flex items-center justify-center gap-4">
                        {scanning ? (
                          <>
                            <Loader2 className="h-6 w-6 animate-spin" />
                            جاري التعرف المركزي...
                          </>
                        ) : palmHash ? (
                          <>
                            <Check className="h-6 w-6" />
                            تم اكتشاف البصمة
                          </>
                        ) : (
                          <>
                            <Scan className="h-6 w-6 group-hover:scale-110 transition-transform" />
                            مسح بصمة الكف
                          </>
                        )}
                      </div>
                      {!palmHash && !scanning && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                      )}
                    </Button>
                    {palmHash && (
                      <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10 text-center animate-in fade-in zoom-in duration-500">
                        <span className="text-[10px] font-black text-green-500/60 uppercase tracking-widest">{palmHash}</span>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={processPayment}
                    disabled={!amount || !palmHash || processing}
                    className="w-full h-20 bg-secondary text-primary hover:bg-white hover:scale-[1.02] transition-all duration-500 font-black text-2xl rounded-[2rem] shadow-[0_20px_40px_-10px_rgba(251,191,36,0.3)]"
                  >
                    {processing ? (
                      <div className="flex items-center gap-4">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        جاري معالجة الدفع...
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <CreditCard className="h-6 w-6" />
                        تأكيد الدفع الآن
                      </div>
                    )}
                  </Button>
                </>
              )}

              {paymentStatus === 'success' && (
                <div className="text-center py-16 space-y-8 animate-in zoom-in duration-700">
                  <div className="relative inline-block">
                    <div className="w-32 h-32 rounded-full bg-green-500/20 flex items-center justify-center border-4 border-green-500/50">
                      <Check className="h-16 w-16 text-green-500 animate-bounce" />
                    </div>
                    <div className="absolute -inset-4 bg-green-500/10 rounded-full animate-ping"></div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-4xl font-black text-white italic">تم الدفع بنجاح</h3>
                    <p className="text-white/40 text-lg font-light">تم خصم المبلغ من محفظتك البيومترية</p>
                  </div>
                  <div className="p-6 rounded-3xl bg-white/5 border border-white/5">
                    <span className="text-5xl font-black text-secondary">{amount}</span>
                    <span className="text-lg font-bold text-white/30 mr-3 uppercase">SAR</span>
                  </div>
                </div>
              )}

              {paymentStatus === 'failed' && (
                <div className="text-center py-16 space-y-8 animate-in shake duration-500">
                  <div className="w-32 h-32 mx-auto rounded-full bg-red-500/20 flex items-center justify-center border-4 border-red-500/50">
                    <X className="h-16 w-16 text-red-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-4xl font-black text-white">فشلت العملية</h3>
                    <p className="text-white/40 text-lg font-light">حدث خطأ أثناء الاتصال بالخادم المركزي</p>
                  </div>
                  <Button
                    onClick={() => setPaymentStatus('idle')}
                    className="h-14 px-8 bg-white/5 text-white hover:bg-white/10 rounded-2xl"
                  >
                    إعادة المحاولة
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

export default POS;
