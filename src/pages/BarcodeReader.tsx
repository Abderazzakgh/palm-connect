import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import QRScanner from "@/components/QRScanner";
import { useNavigate } from "react-router-dom";
import { Copy, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BarcodeReader = () => {
  const [decoded, setDecoded] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      const createdQr = localStorage.getItem('created_qr');
      if (!createdQr) {
        toast({ title: 'معلومة', description: 'يمكنك قراءة أي باركود صالح أو العودة لإنشاء باركود جديد', });
      }
    })();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <Button variant="outline" onClick={() => navigate("/")} className="mb-6">
          العودة للرئيسية
        </Button>

        <Card className="shadow-lg border-2 border-primary/10">
          <CardHeader>
            <CardTitle className="text-3xl">قارئ الباركود</CardTitle>
            <CardDescription>استخدم كاميرا الجهاز لمسح الباركود وعرض محتواه</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2 md:grid-cols-5">
              <Button variant="default" disabled className="justify-start">1) إنشاء حساب</Button>
              <Button variant="default" className="justify-start" onClick={() => navigate('/scanner')}>2) إنشاء الباركود</Button>
              <Button variant="default" className="justify-start">3) قراءة الباركود</Button>
              <Button variant="secondary" className="justify-start" onClick={() => navigate('/dashboard')}>4) إكمال الملف</Button>
              <Button variant="secondary" disabled className="justify-start">5) البدء بالاستخدام</Button>
            </div>
            <QRScanner onScanSuccess={(text) => { setDecoded(text); localStorage.setItem('barcode_read', '1'); localStorage.setItem('scanned_qr', text); toast({ title: 'تمت القراءة', description: 'يمكنك الآن إكمال الملف', }); }} />

            <div className="space-y-3">
              <Label htmlFor="manual-barcode">إدخال الكود يدوياً</Label>
              <div className="flex gap-2">
                <Input id="manual-barcode" placeholder="BIOMETRIC_XXXX أو JSON يحتوي hash" value={manualCode} onChange={(e) => setManualCode(e.target.value)} dir="ltr" />
                <Button
                  variant="outline"
                  onClick={() => {
                    const text = manualCode.trim();
                    if (!text) { toast({ title: 'أدخل الكود', description: 'يرجى إدخال قيمة صحيحة', variant: 'destructive' }); return; }
                    setDecoded(text);
                    localStorage.setItem('barcode_read', '1');
                    localStorage.setItem('scanned_qr', text);
                    toast({ title: 'تم الإدخال', description: 'تمت قراءة الكود يدوياً' });
                  }}
                >
                  قراءة
                </Button>
              </div>
            </div>

            {decoded && (
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-2 text-secondary">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">تمت القراءة بنجاح</span>
                </div>
                <div className="text-sm text-muted-foreground mb-3">المحتوى المقروء:</div>
                <pre className="whitespace-pre-wrap break-all text-sm bg-muted p-3 rounded">
                  {decoded}
                </pre>
                <div className="flex gap-2 mt-3">
                  <Button onClick={() => navigator.clipboard.writeText(decoded)} variant="outline">
                    <Copy className="ml-2 h-4 w-4" /> نسخ المحتوى
                  </Button>
                  <Button onClick={() => setDecoded(null)} variant="ghost">
                    مسح القراءة
                  </Button>
                  <Button onClick={() => navigate('/dashboard')}>
                    إكمال الملف
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BarcodeReader;