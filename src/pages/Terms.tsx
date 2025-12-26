import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-3xl">
        <Button variant="outline" onClick={() => navigate("/")} className="mb-6">
          العودة للرئيسية
        </Button>

        <Card className="shadow-lg border-2 border-primary/10">
          <CardHeader>
            <CardTitle className="text-3xl">شروط الاستخدام</CardTitle>
            <CardDescription>
              الشروط الأساسية لاستخدام النظام وتشغيله
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              باستخدامك للنظام، أنت توافق على الالتزام بالسياسات الأمنية وعدم إساءة استخدام الخدمات أو محاولة تجاوز الصلاحيات.
            </p>
            <p>
              هذه النسخة موجهة للاختبار/العرض. قبل الاستخدام التجاري، يجب اعتماد متطلبات قانونية، وتقييم مخاطر، وتفعيل المراقبة والسجلات.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Terms;
