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
    <div className="min-h-screen mesh-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-[120px] animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/30 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-lg relative z-10 transition-all duration-700 animate-in fade-in zoom-in-95">
        <div className="glass-card rounded-[2.5rem] border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden">

          <div className="absolute top-0 right-0 p-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary/20 to-primary/20 backdrop-blur-xl border border-white/10 flex items-center justify-center animate-float">
              <Fingerprint className="h-6 w-6 text-secondary" />
            </div>
          </div>

          <CardHeader className="text-center pt-16 pb-8">
            <CardTitle className="text-4xl font-black text-white mb-3 tracking-tight">
              {view === "login" && "أهلاً بك مجدداً"}
              {view === "register" && "انضم إلينا"}
              {view === "otp" && "الدخول السريع"}
              {view === "reset" && "استعادة الوصول"}
            </CardTitle>
            <CardDescription className="text-lg text-white/50 font-light px-8">
              {view === "login" && "سجل دخولك لتجربة مستقبل المصادقة الرقمية"}
              {view === "register" && "أنشئ حسابك وابدأ رحلة الأمان البيومتري"}
              {view === "otp" && "أدخل رقم هاتفك لنرسل لك مفتاح السحاب"}
              {view === "reset" && "سنرسل لك رابطاً لإعادة تعيين مفاتيحك"}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-12">
            {view === "login" && (
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-white/70 text-sm font-bold uppercase tracking-widest mr-1">البريد الإلكتروني</Label>
                  <div className="relative group">
                    <Mail className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within:text-secondary transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      dir="ltr"
                      className="h-14 pr-12 bg-white/5 border-white/10 text-white rounded-2xl focus:ring-secondary/50 focus:border-secondary transition-all"
                      placeholder="name@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <Label htmlFor="password" className="text-white/70 text-sm font-bold uppercase tracking-widest">كلمة المرور</Label>
                    <button type="button" onClick={() => setView("reset")} className="text-xs text-secondary/70 hover:text-secondary transition-colors">
                      نسيت كلمة المرور؟
                    </button>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within:text-secondary transition-colors" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-14 pr-12 pl-12 bg-white/5 border-white/10 text-white rounded-2xl focus:ring-secondary/50 focus:border-secondary transition-all"
                      dir="ltr"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full h-14 bg-secondary text-primary hover:bg-white hover:scale-[1.02] transition-all duration-500 font-black text-lg rounded-2xl shadow-xl shadow-secondary/10" disabled={loading}>
                  {loading ? <><Loader2 className="ml-2 h-5 w-5 animate-spin" /> جاري التحقق...</> : "دخول النظام"}
                </Button>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-transparent px-2 text-white/30">أو عبر المنصات</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Button type="button" onClick={() => handleOAuth("google")} className="h-12 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-xl transition-all">
                    Google
                  </Button>
                  <Button type="button" onClick={() => handleOAuth("github")} className="h-12 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-xl transition-all">
                    GitHub
                  </Button>
                </div>

                <div className="flex flex-col gap-3 mt-8">
                  <Button variant="ghost" onClick={() => setView("register")} className="h-12 text-white/60 hover:text-white hover:bg-white/5 rounded-xl font-bold">
                    ليس لديك حساب؟ <span className="text-secondary mr-2">أنشئ واحداً الآن</span>
                  </Button>
                  <Button variant="ghost" onClick={() => setView("otp")} className="h-12 text-white/60 hover:text-white hover:bg-white/5 rounded-xl font-bold">
                    الدخول عبر <span className="text-secondary mr-2">رقم الهاتف</span>
                  </Button>
                </div>
              </form>
            )}

            {view === "register" && (
              <form onSubmit={handleSignup} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="fullName" className="text-white/70 text-sm font-bold uppercase tracking-widest mr-1">الاسم الكامل</Label>
                  <div className="relative group">
                    <User className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within:text-secondary transition-colors" />
                    <Input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="h-14 pr-12 bg-white/5 border-white/10 text-white rounded-2xl focus:ring-secondary/50 focus:border-secondary transition-all"
                      placeholder="الاسم الثلاثي"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="email" className="text-white/70 text-sm font-bold uppercase tracking-widest mr-1">البريد الإلكتروني</Label>
                  <div className="relative group">
                    <Mail className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within:text-secondary transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      dir="ltr"
                      className="h-14 pr-12 bg-white/5 border-white/10 text-white rounded-2xl focus:ring-secondary/50 focus:border-secondary transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="password" className="text-white/70 text-sm font-bold uppercase tracking-widest mr-1">كلمة المرور</Label>
                  <div className="relative group">
                    <Lock className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within:text-secondary transition-colors" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-14 pr-12 pl-12 bg-white/5 border-white/10 text-white rounded-2xl focus:ring-secondary/50 focus:border-secondary transition-all"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-white/70 text-sm font-bold uppercase tracking-widest mr-1">الدور الوظيفي</Label>
                  <Select value={role} onValueChange={(val) => setRole(val as 'user' | 'operator' | 'admin')}>
                    <SelectTrigger className="h-14 bg-white/5 border-white/10 text-white rounded-2xl">
                      <SelectValue placeholder="اختر الدور" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      <SelectItem value="user">مستخدم عادي</SelectItem>
                      <SelectItem value="operator">مشغل نظام</SelectItem>
                      <SelectItem value="admin">مدير نظام</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" className="w-full h-14 bg-secondary text-primary hover:bg-white hover:scale-[1.02] transition-all duration-500 font-black text-lg rounded-2xl shadow-xl shadow-secondary/10" disabled={loading}>
                  {loading ? <><Loader2 className="ml-2 h-5 w-5 animate-spin" /> جاري البناء...</> : "تأكيد التسجيل"}
                </Button>

                <div className="mt-6 text-center">
                  <button type="button" onClick={() => setView("login")} className="text-white/50 hover:text-secondary transition-colors font-medium">
                    لديك حساب بالفعل؟ <span className="underline mr-1">سجل دخولك</span>
                  </button>
                </div>
              </form>
            )}

            {view === "otp" && (
              <form onSubmit={handleSendOtp} className="space-y-8">
                <div className="space-y-3">
                  <Label htmlFor="phone" className="text-white/70 text-sm font-bold uppercase tracking-widest mr-1">رقم الهاتف الدولي</Label>
                  <div className="relative group">
                    <Phone className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within:text-secondary transition-colors" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+216 XX XXX XXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="h-14 pr-12 bg-white/5 border-white/10 text-white rounded-2xl focus:ring-secondary/50 focus:border-secondary transition-all"
                      dir="ltr"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-14 bg-secondary text-primary hover:bg-white transition-all duration-500 font-black text-lg rounded-2xl shadow-xl" disabled={loading}>
                  {loading ? <><Loader2 className="ml-2 h-5 w-5 animate-spin" /> جاري الإرسال...</> : "إرسال رمز التحقق"}
                </Button>

                <div className="mt-4 text-center">
                  <button type="button" onClick={() => setView("login")} className="text-white/50 hover:text-white transition-colors">
                    العودة للخيارات السابقة
                  </button>
                </div>
              </form>
            )}

            {view === "reset" && (
              <form onSubmit={handleResetPassword} className="space-y-8">
                <div className="space-y-3">
                  <Label htmlFor="emailReset" className="text-white/70 text-sm font-bold uppercase tracking-widest mr-1">بريدك المسجل</Label>
                  <div className="relative group">
                    <Mail className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-white/30 group-focus-within:text-secondary transition-colors" />
                    <Input
                      id="emailReset"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      dir="ltr"
                      className="h-14 pr-12 bg-white/5 border-white/10 text-white rounded-2xl focus:ring-secondary/50 focus:border-secondary transition-all"
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-14 bg-secondary text-primary hover:bg-white transition-all duration-500 font-black text-lg rounded-2xl shadow-xl" disabled={loading}>
                  {loading ? <><Loader2 className="ml-2 h-5 w-5 animate-spin" /> جاري الطلب...</> : "إرسال رابط الاستعادة"}
                </Button>

                <div className="mt-4 text-center">
                  <button type="button" onClick={() => setView("login")} className="text-white/50 hover:text-white transition-colors">
                    العودة لتسجيل الدخول
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </div>
      </div >
    </div >
  );
};

export default AuthUnified;
