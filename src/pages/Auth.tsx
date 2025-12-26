// AuthUnified.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Mail, Lock, Eye, EyeOff, Fingerprint, LogIn, UserPlus, Phone, Key, RotateCcw } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

/**
 * صفحة موحّدة: Login | Register | OTP | Reset
 *
 * يضع full_name في user_profiles بعد التسجيل
 * يوجه المستخدم حسب role الموجود في user_metadata.role
 */

// ---- Validation Schemas ----
const loginSchema = z.object({
  email: z.string().email({ message: "البريد الإلكتروني غير صحيح" }),
  password: z.string().min(6, { message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }),
});

const signupSchema = z.object({
  email: z.string().email({ message: "البريد الإلكتروني غير صحيح" }),
  password: z.string().min(6, { message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }),
  full_name: z.string().min(2, { message: "الاسم يجب أن يكون حرفين على الأقل" }),
  role: z.enum(["user", "operator", "admin"]).optional(),
});

const otpSchema = z.object({
  phone: z.string().min(8, { message: "أدخل رقم هاتف صالح" }),
});

const resetSchema = z.object({
  email: z.string().email({ message: "البريد الإلكتروني غير صحيح" }),
});

type View = "login" | "register" | "otp" | "reset";

const AuthUnified: React.FC = () => {
  const [view, setView] = useState<View>("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // common fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // signup extras
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"user" | "operator" | "admin">("user");

  // otp phone
  const [phone, setPhone] = useState("");

  const { toast } = useToast();
  const navigate = useNavigate();

  // redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        void handleRoleRedirect(session.user);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) void handleRoleRedirect(session.user);
    });

    return () => {
      data?.subscription?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // helper: insert user_profiles row after sign up
  // Fix: make createUserProfile signature compatible with call site,
  // don't require a phone parameter, and keep logic as before.
  const createUserProfile = async (userId: string, name: string, phone?: string) => {
    try {
      await supabase.from("user_profiles").insert({
        user_id: userId,
        full_name: name,
        palm_print_id: null,
        phone: phone ?? "",
      });
    } catch (err) {
      // لا نفشل التسجيل إذا فشل الإدخال، لكن نعرض تحذيراً
      console.error("createUserProfile error:", err);
    }
  };

  // helper: redirect based on role and progression
  const handleRoleRedirect = async (user: SupabaseUser) => {
    const role = (user?.user_metadata?.role as string) || (user?.role as string) || "user";
    if (role === "operator") { navigate("/access"); return; }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('palm_print_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const hasPalmLinked = !!profile?.palm_print_id;
    
    // التوجيه بناءً على وجود بصمة
    if (hasPalmLinked) {
      navigate('/dashboard');
    } else {
      navigate('/scanner');
    }
  };

  // --- login with email/password ---
  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      loginSchema.parse({ email, password });
    } catch (err: unknown) {
      const msg = err instanceof z.ZodError ? err.errors[0]?.message || "تحقق من الحقول" : "تحقق من الحقول";
      toast({ title: "خطأ", description: msg, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data?.user) await handleRoleRedirect(data.user);
      toast({ title: "نجاح", description: "تم تسجيل الدخول" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "فشل تسجيل الدخول", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // --- signup (create auth user + user_profiles row) ---
  const handleSignup = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      signupSchema.parse({ email, password, full_name: fullName, role });
    } catch (err: unknown) {
      const msg = err instanceof z.ZodError ? err.errors[0]?.message || "تحقق من الحقول" : "تحقق من الحقول";
      toast({ title: "خطأ", description: msg, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // هنا نضع الاسم والـrole داخل user_metadata
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name: fullName, role },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw error;

      // في بعض نسخ Supabase، data.user قد تكون موجودة فوراً أو بعد التفعيل.
      const userId = data?.user?.id ?? null;
      if (userId) {
        await createUserProfile(userId, fullName);
      }

      toast({
        title: "🎉 تم إنشاء الحساب!",
        description:
          "تم إرسال بريد التفعيل (إن وُجد). انتقل إلى لوحة التحكم لإتمام المراحل.",
      });

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

      navigate('/scanner');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "فشل التسجيل", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // --- OTP (phone) sign-in ---
  const handleSendOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      otpSchema.parse({ phone });
    } catch (err: unknown) {
      const msg = err instanceof z.ZodError ? err.errors[0]?.message || "تحقق من رقم الهاتف" : "تحقق من رقم الهاتف";
      toast({ title: "خطأ", description: msg, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // supabase.auth.signInWithOtp supports email or phone depending on provider
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      toast({ title: "رمز تم إرساله", description: "تحقق من هاتفك لاستلام رمز الدخول" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "فشل إرسال الرمز", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // --- password reset ---
  const handleResetPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      resetSchema.parse({ email });
    } catch (err: unknown) {
      const msg = err instanceof z.ZodError ? err.errors[0]?.message || "تحقق من البريد" : "تحقق من البريد";
      toast({ title: "خطأ", description: msg, variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // many Supabase projects use resetPasswordForEmail – هذا قد يختلف حسب نسخة SDK
      // نستخدم واجهة options لإرسال رابط يعيد التوجيه إلى /auth/reset (يمكنك تغييره)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`
      });
      if (error) throw error;
      toast({ title: "تم الإرسال", description: "تحقق من بريدك ليتضمن رابط إعادة التعيين" });
      setView("login");
    } catch (err: unknown) {
      // fallback: محاولة استخدام older API shape
      try {
        const legacy = supabase.auth as unknown as {
          api?: { resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }> };
        };
        const api = legacy.api;
        if (api?.resetPasswordForEmail) {
          const { error } = await api.resetPasswordForEmail(email);
          if (error) throw error;
          toast({ title: "تم الإرسال", description: "تحقق من بريدك" });
        } else {
          throw new Error("Reset API not available");
        }
      } catch (err2: unknown) {
        const msg2 = err2 instanceof Error ? err2.message : String(err2);
        const msg = err instanceof Error ? err.message : msg2;
        toast({ title: "فشل", description: msg, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  // --- OAuth Sign In (Google / GitHub) ---
  const handleOAuth = async (provider: "google" | "github") => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider });
      if (error) throw error;
      // بعد إعادة التوجيه، onAuthStateChange سيهتم بالتوجيه
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "فشل تسجيل الدخول", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5QzkyQUMiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
      
      <Card className="w-full max-w-md shadow-2xl border-0 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-secondary/20 rounded-full blur-3xl"></div>
        
        <CardHeader className="text-center relative z-10 pb-6">
          <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-2xl">
            <Fingerprint className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            {view === "login" && "تسجيل الدخول"}
            {view === "register" && "إنشاء حساب"}
            {view === "otp" && "دخول عبر الهاتف"}
            {view === "reset" && "إعادة تعيين كلمة المرور"}
          </CardTitle>
          <CardDescription className="text-muted-foreground/80">
            {view === "login" && "اختر طريقة تسجيل الدخول أو نفّذ تسجيل جديد"}
            {view === "register" && "أنشئ حسابك وسيتم حفظ اسمك تلقائياً"}
            {view === "otp" && "أدخل رقم هاتفك لاستلام رمز"}
            {view === "reset" && "أدخل بريدك لإرسال رابط إعادة التعيين"}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="relative z-10">
          {view === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    dir="ltr" 
                    className="pr-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    className="pr-10"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> جاري...</> : <><LogIn className="mr-2 h-4 w-4" /> تسجيل الدخول</>}
              </Button>
              
              <div className="flex gap-2 mt-3">
                <Button variant="outline" onClick={() => setView("register")} className="flex-1">
                  <UserPlus className="mr-2 h-4 w-4" />
                  إنشاء حساب
                </Button>
                <Button variant="outline" onClick={() => setView("otp")} className="flex-1">
                  <Phone className="mr-2 h-4 w-4" />
                  دخول بالهاتف
                </Button>
              </div>
              
              <div className="mt-4 text-center">
                <Button variant="link" onClick={() => setView("reset")}>
                  نسيت كلمة المرور؟
                </Button>
              </div>
              
              <div className="mt-4">
                <div className="text-center mb-2 text-sm text-muted-foreground">أو سجل عبر</div>
                <div className="flex gap-2">
                  <Button onClick={() => handleOAuth("google")} className="flex-1 bg-red-500 hover:bg-red-600 text-white">
                    Google
                  </Button>
                  <Button onClick={() => handleOAuth("github")} className="flex-1 bg-gray-800 hover:bg-gray-900 text-white">
                    GitHub
                  </Button>
                </div>
              </div>
            </form>
          )}
          
          {view === "register" && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">الاسم الكامل</Label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="fullName" 
                    type="text" 
                    value={fullName} 
                    onChange={(e) => setFullName(e.target.value)} 
                    required 
                    className="pr-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    dir="ltr" 
                    className="pr-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type={showPassword ? "text" : "password"} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    className="pr-10"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>الدور (Role)</Label>
                <Select value={role} onValueChange={(val) => setRole(val as 'user' | 'operator' | 'admin')}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر الدور" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="operator">Operator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button type="submit" className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-semibold py-6 text-lg" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> جاري...</> : <><UserPlus className="mr-2 h-4 w-4" /> إنشاء حساب</>}
              </Button>
              
              <div className="mt-3 text-center">
                <Button variant="link" onClick={() => setView("login")}>
                  لديك حساب؟ تسجيل الدخول
                </Button>
              </div>
            </form>
          )}
          
          {view === "otp" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف (بصيغة دولية)</Label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="phone" 
                    type="tel" 
                    placeholder="+216xxxxxxxx" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    required 
                    className="pr-10"
                  />
                </div>
              </div>
              
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> جاري...</> : <><Key className="mr-2 h-4 w-4" /> إرسال رمز (OTP)</>}
              </Button>
              
              <div className="mt-2 text-center">
                <Button variant="link" onClick={() => setView("login")}>
                  العودة إلى تسجيل الدخول
                </Button>
              </div>
            </form>
          )}
          
          {view === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="emailReset">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="emailReset" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    dir="ltr" 
                    className="pr-10"
                  />
                </div>
              </div>
              
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> جاري...</> : <><RotateCcw className="mr-2 h-4 w-4" /> إرسال رابط إعادة التعيين</>}
              </Button>
              
              <div className="mt-2 text-center">
                <Button variant="link" onClick={() => setView("login")}>
                  العودة إلى تسجيل الدخول
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthUnified;
