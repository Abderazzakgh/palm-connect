import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";
import { Loader2, LogOut, CreditCard, Scan, History, ArrowRight } from "lucide-react";
import CompleteProfile from "@/components/CompleteProfile";
import LinkPalmPrint from "@/components/LinkPalmPrint";
import ProfileInfo from "@/components/ProfileInfo";

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<(Tables<'user_profiles'> & { palm_prints?: Tables<'palm_prints'>[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState<Tables<'transactions'>[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        navigate('/auth');
      }
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUser = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      setUser(user);

      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*, palm_prints(*)')
        .eq('user_id', user.id)
        .maybeSingle();

      setProfile(profileData as unknown as (Tables<'user_profiles'> & { palm_prints?: Tables<'palm_prints'>[] }) | null);

      // Redirection selon l’état d’avancement
      const prof = profileData as unknown as (Tables<'user_profiles'> & { palm_prints?: Tables<'palm_prints'>[] }) | null;
      const hasPalmLinked = !!prof?.palm_print_id || ((prof?.palm_prints?.length ?? 0) > 0);
      const hasProfileBasic = !!prof?.full_name && !!prof?.phone;
      const hasBankInfo = !!prof?.atm_card_last_4 && !!prof?.bank_name;

      if (!hasPalmLinked) {
        toast({ title: 'أكمل المرحلة السابقة', description: 'يرجى قراءة/إدخال الباركود لربط البصمة هنا', variant: 'destructive' });
      }

      // عند الربط، سيظهر مكوّن إكمال الملف تلقائياً وفق حالة البيانات

      // إذا كان ينقصه معلومات الملف أو البنكية، سنبقيه في Dashboard لإظهار CompleteProfile

      // Fetch recent transactions
      if (profileData) {
        const { data: transactionsData } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        setRecentTransactions(transactionsData || []);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Error checking user:', msg);
    } finally {
      setLoading(false);
    }
  }, [navigate, toast]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    try {
      localStorage.removeItem('scanned_qr');
      localStorage.removeItem('barcode_read');
      localStorage.removeItem('created_qr');
      localStorage.removeItem('created_palm_id');
      localStorage.removeItem('palm_registered');
      localStorage.removeItem('jump_complete_profile');
    } catch (e) {
      console.warn('localStorage cleanup failed', e);
    }
    navigate('/');
  };

  const handleProfileComplete = () => {
    checkUser();
  };

  if (loading) {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-secondary/20 rounded-full blur-2xl animate-pulse"></div>
            <Loader2 className="h-16 w-16 animate-spin text-secondary relative z-10" />
          </div>
          <p className="text-white/60 font-medium tracking-widest uppercase animate-pulse">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  const hasPalmLinked = !!profile?.palm_print_id || ((profile?.palm_prints?.length ?? 0) > 0);
  const isProfileComplete = !!profile?.full_name && !!profile?.phone && !!profile?.bank_name && !!profile?.atm_card_last_4;

  return (
    <div className="min-h-screen mesh-bg py-20 px-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] animate-blob"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>

      <div className="container mx-auto max-w-6xl relative z-10">
        <div className="glass-card rounded-[3rem] border-white/10 overflow-hidden p-8 md:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
            <div className="space-y-2">
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                لوحة <span className="text-secondary text-glow">التحكم</span>
              </h1>
              <p className="text-white/40 font-light text-lg">مرحباً بك في مركز إدارة هويتك البيومترية</p>
            </div>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="h-12 border-white/10 bg-white/5 text-white hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50 transition-all duration-500 rounded-2xl px-6"
            >
              <LogOut className="ml-2 h-4 w-4" />
              إنهاء الجلسة
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-16 p-2 bg-white/5 rounded-3xl backdrop-blur-sm border border-white/10">
            {[
              { id: 1, label: "الحساب", done: !!user },
              { id: 2, label: "البيومترية", done: hasPalmLinked },
              { id: 3, label: "التوثيق", done: !!localStorage.getItem('barcode_read') },
              { id: 4, label: "الملف", done: isProfileComplete },
              { id: 5, label: "التفعيل", done: isProfileComplete && !!profile?.bank_name }
            ].map((s) => (
              <div
                key={s.id}
                className={`flex flex-col items-center gap-2 py-4 rounded-2xl transition-all duration-500 ${s.done ? "text-secondary/80 bg-secondary/5" : "text-white/20"
                  }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${s.done ? "border-secondary bg-secondary/20 text-secondary shadow-[0_0_15px_rgba(251,191,36,0.3)]" : "border-white/10"
                  }`}>
                  {s.id}
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="space-y-12">
            {!hasPalmLinked ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <LinkPalmPrint userId={user?.id || ""} onComplete={handleProfileComplete} />
              </div>
            ) : !isProfileComplete ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <CompleteProfile userId={user?.id || ""} onComplete={handleProfileComplete} />
              </div>
            ) : (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <ProfileInfo profile={profile as Tables<'user_profiles'>} />

                <div className="grid gap-6 md:grid-cols-3">
                  {[
                    { title: "نقطة البيع", desc: "الدفع بالبصمة الحيوية", icon: CreditCard, path: "/pos", color: "secondary" },
                    { title: "التحكم بالدخول", desc: "نظام الدخول والخروج الذكي", icon: Scan, path: "/access", color: "primary" },
                    { title: "سجل المعاملات", desc: "جميع العمليات والأنشطة", icon: History, path: "/transactions", color: "secondary" }
                  ].map((card, i) => (
                    <div
                      key={i}
                      onClick={() => navigate(card.path)}
                      className="group relative glass-card p-8 rounded-[2rem] border-white/5 hover:border-secondary/30 transition-all duration-500 cursor-pointer overflow-hidden shadow-2xl hover:-translate-y-2"
                    >
                      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-150 transition-transform duration-700">
                        <card.icon className="h-24 w-24 text-white" />
                      </div>
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br transition-all duration-500 flex items-center justify-center mb-6 ${card.color === 'secondary' ? "from-secondary to-amber-500 text-primary shadow-lg shadow-secondary/20" : "from-primary to-blue-600 text-white shadow-lg shadow-primary/20"
                        }`}>
                        <card.icon className="h-7 w-7" />
                      </div>
                      <h3 className="text-2xl font-black text-white mb-2">{card.title}</h3>
                      <p className="text-white/40 font-light mb-8">{card.desc}</p>
                      <div className="flex items-center gap-2 text-secondary font-bold text-sm uppercase tracking-widest group-hover:translate-x-2 transition-transform duration-300">
                        استكشاف النظام
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  ))}
                </div>

                {recentTransactions.length > 0 && (
                  <div className="glass-card p-10 rounded-[2.5rem] border-white/10 shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-secondary/30 to-transparent"></div>
                    <div className="flex items-center justify-between mb-10">
                      <div>
                        <h3 className="text-3xl font-black text-white mb-1">أحدث المعاملات</h3>
                        <p className="text-white/40 font-light">متابعة فورية لنشاط حسابك</p>
                      </div>
                      <History className="h-10 w-10 text-white/10" />
                    </div>

                    <div className="space-y-4">
                      {recentTransactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="group flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-300"
                        >
                          <div className="flex items-center gap-6">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${transaction.transaction_type === 'payment' ? "bg-green-500/20 text-green-500" :
                              transaction.transaction_type?.startsWith('access') ? "bg-blue-500/20 text-blue-500" : "bg-white/10 text-white/50"
                              }`}>
                              {transaction.transaction_type === 'payment' ? <CreditCard className="h-6 w-6" /> : <Scan className="h-6 w-6" />}
                            </div>
                            <div>
                              <p className="text-xl font-bold text-white mb-0.5">
                                {transaction.transaction_type === 'payment' ? 'عملية دفع ناجحة' :
                                  transaction.transaction_type === 'access_entry' ? 'تسجيل دخول آمن' :
                                    transaction.transaction_type === 'access_exit' ? 'تسجيل خروج آمن' : 'عملية نظام'}
                              </p>
                              <p className="text-sm text-white/30 font-medium">
                                {new Date(transaction.created_at).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          {transaction.amount && (
                            <div className="text-right">
                              <span className="text-2xl font-black text-secondary">{transaction.amount}</span>
                              <span className="text-xs font-bold text-white/30 mr-2 uppercase">{transaction.currency}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;