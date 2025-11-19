import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, QrCode, Link, Scan } from "lucide-react";
import QRScanner from "./QRScanner";
import type { Tables } from "@/integrations/supabase/types";

interface LinkPalmPrintProps {
  userId: string;
  onComplete: () => void;
}

const LinkPalmPrint = ({ userId, onComplete }: LinkPalmPrintProps) => {
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const saved = localStorage.getItem('scanned_qr');
    if (saved) {
      setQrCode(saved);
    }
  }, []);

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!qrCode.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رمز الباركود",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // QR can be either a plain token (BIOMETRIC_...) or a JSON payload { type, uid, hash }
      let searchField = 'qr_code';
      let searchValue: string = qrCode.trim();
      let parsed: { type?: string; uid?: string; hash?: string } | null = null;
      try {
        const obj = JSON.parse(qrCode) as { type?: string; uid?: string; hash?: string };
        parsed = obj;
        if (obj && obj.hash) {
          searchField = 'palm_hash';
          searchValue = obj.hash;
        }
      } catch (e) {
        // not JSON, proceed with plain string search
      }

      // Try to find a pending palm_print by qr_code or palm_hash
      let palmPrint: Tables<'palm_prints'> | null = null;
      
      if (searchField === 'qr_code') {
        const result = await supabase
          .from('palm_prints')
          .select('*')
          .eq('qr_code', searchValue)
          .in('status', ['pending', 'completed'])

          .maybeSingle();
        if (result.error) {
          throw new Error('حدث خطأ أثناء البحث عن الباركود');
        }
        palmPrint = result.data;
      } else {
        const result = await supabase
          .from('palm_prints')
          .select('*')
          .eq('palm_hash', searchValue)
          .in('status', ['pending', 'completed'])

          .maybeSingle();
        if (result.error) {
          throw new Error('حدث خطأ أثناء البحث عن الباركود');
        }
        palmPrint = result.data;
      }

      if (!palmPrint) {
        throw new Error('الباركود غير صحيح أو منتهي الصلاحية');
      }

      // Check expiry
      if (palmPrint.expires_at && new Date(palmPrint.expires_at) < new Date()) {
        throw new Error('الباركود منتهي الصلاحية');
      }

      // Prepare updates: set matched_user_id if parsed.uid present, set status completed
      const updates: Partial<Tables<'palm_prints'>> = { status: 'completed' };
      if (parsed && parsed.uid) updates.matched_user_id = parsed.uid;

      // Update palm_prints and user_profiles. Attempt to update profile first, then palm_prints.
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({ palm_print_id: palmPrint.id })
        .eq('user_id', userId);
      
      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw new Error('فشل تحديث الملف الشخصي');
      }

      const { error: ppErr } = await supabase
        .from('palm_prints')
        .update(updates)
        .eq('id', palmPrint.id);
      
      if (ppErr) {
        console.error('Error updating palm print:', ppErr);
        throw new Error('فشل تحديث بصمة الكف');
      }

      toast({ title: 'تم الربط بنجاح!', description: 'تم ربط بصمة الكف بحسابك' });
      localStorage.removeItem('scanned_qr');
      localStorage.setItem('barcode_read', '1');
      onComplete();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "حدث خطأ أثناء الربط";
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleScanSuccess = (decodedText: string) => {
    console.log("📱 الباركود الممسوح:", decodedText);
    setQrCode(decodedText);
    setShowScanner(false);
    toast({
      title: "تم المسح بنجاح",
      description: `تم قراءة الباركود: ${decodedText.substring(0, 20)}...`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl flex items-center">
          <QrCode className="ml-2 h-6 w-6" />
          ربط بصمة الكف
        </CardTitle>
        <CardDescription>
          امسح الباركود الذي حصلت عليه من جهاز المسح أو أدخله يدوياً
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showScanner ? (
          <QRScanner
            onScanSuccess={handleScanSuccess}
            onClose={() => setShowScanner(false)}
          />
        ) : (
          <>
            <form onSubmit={handleLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qrCode">رمز الباركود</Label>
                <div className="flex gap-2">
                  <Input
                    id="qrCode"
                    placeholder="BIOMETRIC_XXXXXXXXXXXX أو JSON مثل: {&quot;type&quot;:&quot;SAVANNA_BIOMETRIC&quot;,&quot;uid&quot;:&quot;uid-xxxxx&quot;,&quot;hash&quot;:&quot;PALM_xxx&quot;}"
                    value={qrCode}
                    onChange={(e) => setQrCode(e.target.value)}
                    required
                    dir="ltr"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowScanner(true)}
                    className="px-4"
                    title="مسح الباركود بالكاميرا"
                  >
                    <Scan className="h-4 w-4" />
                  </Button>
                </div>
                {qrCode && (
                  <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                    <strong>الباركود الحالي:</strong> <code className="text-xs">{qrCode.length > 50 ? qrCode.substring(0, 50) + '...' : qrCode}</code>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الربط...
                  </>
                ) : (
                  <>
                    <Link className="ml-2 h-4 w-4" />
                    ربط البصمة
                  </>
                )}
              </Button>
            </form>
          </>
        )}

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 <strong>نصيحة:</strong> يمكنك الحصول على الباركود من جهاز مسح بصمة الكف. 
            الباركود صالح لمدة 24 ساعة فقط.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LinkPalmPrint;