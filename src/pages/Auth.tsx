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
import { Loader2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

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
  const handleRoleRedirect = async (user: User) => {
    const role = (user?.user_metadata?.role as string) || (user?.role as string) || "user";
    if (role === "operator") { navigate("/access"); return; }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('palm_print_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const hasPalmLinked = !!profile?.palm_print_id;
    navigate('/dashboard');
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
        title: "تم إنشاء الحساب",
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

      navigate('/dashboard');
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md shadow-lg border-2 border-primary/10">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl mb-1">
            {view === "login" && "تسجيل الدخول"}
            {view === "register" && "إنشاء حساب"}
            {view === "otp" && "دخول عبر الهاتف (OTP)"}
            {view === "reset" && "إعادة تعيين كلمة المرور"}
          </CardTitle>
          <CardDescription>
            {view === "login" && "اختر طريقة تسجيل الدخول أو نفّذ تسجيل جديد"}
            {view === "register" && "أنشئ حسابك وسيتم حفظ اسمك تلقائياً"}
            {view === "otp" && "أدخل رقم هاتفك لاستلام رمز"}
            {view === "reset" && "أدخل بريدك لإرسال رابط إعادة التعيين"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {view === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" />
              </div>
              <div>
                <Label htmlFor="password">كلمة المرور</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required dir="ltr" />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="ml-2 h-4 w-4 animate-spin"/> جاري...</> : "تسجيل الدخول"}
              </Button>

              <div className="flex gap-2 mt-3">
                <Button variant="outline" onClick={() => setView("register")}>إنشاء حساب</Button>
                <Button variant="outline" onClick={() => setView("otp")}>دخول بالهاتف</Button>
                <Button variant="link" onClick={() => setView("reset")}>نسيت كلمة المرور؟</Button>
              </div>

              <div className="mt-4">
                <div className="text-center mb-2">أو سجل عبر</div>
                <div className="flex gap-2">
                  <Button onClick={() => handleOAuth("google")} className="flex-1">Google</Button>
                  <Button onClick={() => handleOAuth("github")} className="flex-1">GitHub</Button>
                </div>
              </div>
            </form>
          )}

          {view === "register" && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <Label htmlFor="fullName">الاسم الكامل</Label>
                <Input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" />
              </div>
              <div>
                <Label htmlFor="password">كلمة المرور</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required dir="ltr" />
              </div>

              <div>
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

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="ml-2 h-4 w-4 animate-spin"/> جاري...</> : "إنشاء حساب"}
              </Button>

              <div className="mt-3 text-center">
                <Button variant="link" onClick={() => setView("login")}>لديك حساب؟ تسجيل الدخول</Button>
              </div>
            </form>
          )}

          {view === "otp" && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <Label htmlFor="phone">رقم الهاتف (بصيغة دولية)</Label>
                <Input id="phone" type="tel" placeholder="+216xxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="ml-2 h-4 w-4 animate-spin"/> جاري...</> : "أرسل رمز (OTP)"}
              </Button>

              <div className="mt-2 text-center">
                <Button variant="link" onClick={() => setView("login")}>العودة</Button>
              </div>
            </form>
          )}

          {view === "reset" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <Label htmlFor="emailReset">البريد الإلكتروني</Label>
                <Input id="emailReset" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="ml-2 h-4 w-4 animate-spin"/> جاري...</> : "إرسال رابط إعادة التعيين"}
              </Button>

              <div className="mt-2 text-center">
                <Button variant="link" onClick={() => setView("login")}>العودة</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthUnified;
