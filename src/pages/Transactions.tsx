import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Loader2, CreditCard, LogIn, LogOut, Shield, FileCheck, ArrowLeft } from "lucide-react";
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <Button 
          variant="outline" 
          onClick={() => navigate('/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="ml-2 h-4 w-4" />
          العودة للوحة التحكم
        </Button>

        <Card className="shadow-lg border-2 border-primary/10">
          <CardHeader>
            <CardTitle className="text-3xl">سجل المعاملات</CardTitle>
            <CardDescription>
              جميع عملياتك وأنشطتك في النظام
            </CardDescription>
          </CardHeader>

          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>لا توجد معاملات حتى الآن</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <Card key={transaction.id} className="overflow-hidden border border-primary/10">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-1 text-primary">
                            {getTransactionIcon(transaction.transaction_type)}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-semibold">
                                {getTransactionLabel(transaction.transaction_type)}
                              </h4>
                              {getStatusBadge(transaction.status)}
                            </div>
                            {transaction.location && (
                              <p className="text-sm text-muted-foreground">
                                {transaction.location}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {new Date(transaction.created_at).toLocaleString('ar-SA', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                        {transaction.amount != null && (
                          <div className="text-left">
                            <p className="font-bold text-lg">
                              {transaction.amount.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {transaction.currency}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Transactions;
