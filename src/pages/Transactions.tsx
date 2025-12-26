import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Loader2, CreditCard, LogIn, LogOut, Shield, FileCheck, ArrowLeft, History } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Transaction = Tables<'transactions'>;

const Transactions = () => {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const checkUser = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);
      await fetchTransactions(user.id);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('Error checking user:', msg);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    checkUser();
  }, [checkUser]);



  const fetchTransactions = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل تحميل السجلات",
        variant: "destructive",
      });
      return;
    }

    setTransactions(data || []);
  }, [toast]);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <CreditCard className="h-5 w-5" />;
      case 'access_entry':
        return <LogIn className="h-5 w-5" />;
      case 'access_exit':
        return <LogOut className="h-5 w-5" />;
      case 'registration':
        return <FileCheck className="h-5 w-5" />;
      case 'verification':
        return <Shield className="h-5 w-5" />;
      default:
        return <Shield className="h-5 w-5" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'payment':
        return 'عملية دفع';
      case 'access_entry':
        return 'دخول';
      case 'access_exit':
        return 'خروج';
      case 'registration':
        return 'تسجيل';
      case 'verification':
        return 'تحقق';
      default:
        return type;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      pending: "secondary",
      failed: "destructive",
      cancelled: "outline",
    };

    const labels: Record<string, string> = {
      completed: "مكتملة",
      pending: "قيد الانتظار",
      failed: "فاشلة",
      cancelled: "ملغاة",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen mesh-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-secondary/20 rounded-full blur-2xl animate-pulse"></div>
            <Loader2 className="h-16 w-16 animate-spin text-secondary relative z-10" />
          </div>
          <p className="text-white/60 font-medium tracking-widest uppercase animate-pulse">جاري استرجاع السجلات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-bg py-20 px-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] animate-blob"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>

      <div className="container mx-auto max-w-5xl relative z-10">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-8 text-white/60 hover:text-white hover:bg-white/5 rounded-2xl transition-all font-bold tracking-widest uppercase text-xs"
        >
          <ArrowLeft className="ml-2 h-4 w-4" />
          العودة للوحة التحكم
        </Button>

        <div className="glass-card rounded-[3rem] border-white/10 overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)]">
          <div className="p-10 md:p-12 border-b border-white/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-secondary/30 to-transparent"></div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2">
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
                  سجل <span className="text-secondary text-glow">المعاملات</span>
                </h1>
                <p className="text-white/40 text-lg font-light">متابعة دقيقة لكل نشاط قمت به في النظام</p>
              </div>
              <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center animate-float">
                <History className="h-8 w-8 text-white/20" />
              </div>
            </div>
          </div>

          <CardContent className="p-8 md:p-12">
            {transactions.length === 0 ? (
              <div className="text-center py-20 space-y-6">
                <div className="relative inline-block">
                  <Shield className="h-24 w-24 mx-auto text-white/5" />
                  <div className="absolute inset-0 bg-white/5 rounded-full blur-3xl"></div>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-black text-white">لا توجد سجلات</p>
                  <p className="text-white/40 font-light max-w-xs mx-auto">سيتم عرض جميع معاملاتك البنكية والأمنية هنا فور حدوثها</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {transactions.map((transaction, idx) => (
                  <div
                    key={transaction.id}
                    className="group relative glass-card p-6 md:p-8 rounded-[2.5rem] border-white/5 hover:border-secondary/30 transition-all duration-500 overflow-hidden shadow-xl"
                    style={{ animationDelay: `${idx * 100}ms` }}
                  >
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                      <div className="flex items-center gap-6 flex-1 w-full md:w-auto">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 bg-white/5 border border-white/10 group-hover:bg-secondary group-hover:text-primary ${transaction.transaction_type === 'payment' ? "text-green-500" :
                          transaction.transaction_type?.startsWith('access') ? "text-blue-500" : "text-white/50"
                          }`}>
                          {getTransactionIcon(transaction.transaction_type)}
                        </div>

                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-4 flex-wrap">
                            <h4 className="text-2xl font-black text-white">
                              {getTransactionLabel(transaction.transaction_type)}
                            </h4>
                            <div className="scale-110">
                              {getStatusBadge(transaction.status)}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-white/40 font-medium text-sm">
                            {transaction.location && (
                              <div className="flex items-center gap-1.5">
                                <Shield className="h-3 w-3" />
                                {transaction.location}
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <History className="h-3 w-3" />
                              {new Date(transaction.created_at).toLocaleString('ar-SA', {
                                day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {transaction.amount != null && (
                        <div className="text-right bg-white/5 py-4 px-8 rounded-3xl border border-white/5 group-hover:bg-white/10 transition-colors w-full md:w-auto">
                          <div className="flex items-baseline justify-center md:justify-end gap-2">
                            <span className="text-3xl font-black text-secondary">{transaction.amount.toFixed(2)}</span>
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{transaction.currency}</span>
                          </div>
                          <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1">القيمة المحصومة</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </div>
      </div>
    </div>
  );
};

export default Transactions;
