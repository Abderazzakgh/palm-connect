import { useEffect, useState } from "react";
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

  const checkUser = async () => {
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
  };

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">لوحة التحكم</h1>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="ml-2 h-4 w-4" />
            تسجيل الخروج
          </Button>
        </div>

        <div className="grid gap-2 mb-6 md:grid-cols-5">
          <Button variant={user ? "default" : "secondary"} disabled className="justify-start">
            1) إنشاء حساب
          </Button>
          <Button variant={(!!profile?.palm_print_id || ((profile?.palm_prints?.length ?? 0) > 0)) ? "default" : "secondary"} className="justify-start" onClick={() => navigate('/scanner')}>
            2) مسح الكف وإنشاء الباركود
          </Button>
          <Button variant={(localStorage.getItem('barcode_read') ? "default" : "secondary")} className="justify-start" onClick={() => navigate('/barcode')}>
            3) قراءة الباركود
          </Button>
          <Button variant={(!!profile?.full_name && !!profile?.phone && !!profile?.bank_name && !!profile?.atm_card_last_4) ? "default" : "secondary"} className="justify-start" onClick={() => navigate('/dashboard')}>
            4) إكمال الملف الشخصي والبنكي
          </Button>
          <Button variant={(!!profile?.bank_name && !!profile?.atm_card_last_4) ? "default" : "secondary"} disabled className="justify-start">
            5) ربط البطاقة والبدء بالدفع
          </Button>
        </div>

        <div className="space-y-6">
          {user?.id && !(!!profile?.palm_print_id || ((profile?.palm_prints?.length ?? 0) > 0)) ? (
            <LinkPalmPrint userId={user.id} onComplete={handleProfileComplete} />
          ) : user?.id && !(!!profile?.full_name && !!profile?.phone && !!profile?.bank_name && !!profile?.atm_card_last_4) ? (
            <CompleteProfile userId={user.id} onComplete={handleProfileComplete} />
          ) : (
            <>
              <ProfileInfo profile={profile as Tables<'user_profiles'>} />
              
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-primary/10 hover:-translate-y-1" onClick={() => navigate('/pos')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      نقطة البيع
                    </CardTitle>
                    <CardDescription>
                      الدفع بالبصمة الحيوية
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" className="w-full justify-between">
                      <span>فتح النظام</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-primary/10 hover:-translate-y-1" onClick={() => navigate('/access')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Scan className="h-5 w-5" />
                      التحكم بالدخول
                    </CardTitle>
                    <CardDescription>
                      نظام الدخول والخروج
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" className="w-full justify-between">
                      <span>فتح النظام</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-all cursor-pointer border-2 border-primary/10 hover:-translate-y-1" onClick={() => navigate('/transactions')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      سجل المعاملات
                    </CardTitle>
                    <CardDescription>
                      جميع العمليات والأنشطة
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" className="w-full justify-between">
                      <span>عرض السجل</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>

                
              </div>

              {recentTransactions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>آخر العمليات</CardTitle>
                    <CardDescription>
                      أحدث 5 معاملات
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {recentTransactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between py-2 border-b last:border-0">
                          <div>
                            <p className="font-medium">
                              {transaction.transaction_type === 'payment' ? 'دفع' : 
                               transaction.transaction_type === 'access_entry' ? 'دخول' :
                               transaction.transaction_type === 'access_exit' ? 'خروج' : 'عملية'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(transaction.created_at).toLocaleDateString('ar-SA')}
                            </p>
                          </div>
                          {transaction.amount && (
                            <span className="font-bold">{transaction.amount} {transaction.currency}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;