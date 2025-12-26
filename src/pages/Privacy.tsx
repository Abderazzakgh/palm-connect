import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-3xl">
        <Button variant="outline" onClick={() => navigate("/")} className="mb-6">
          العودة للرئيسية
        </Button>

        <Card className="shadow-lg border-2 border-primary/10">
          <CardHeader>
            <CardTitle className="text-3xl">سياسة الخصوصية</CardTitle>
            <CardDescription>
              ملخص لكيفية جمع البيانات واستخدامها وحمايتها داخل النظام
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              يهدف هذا النظام إلى توفير مصادقة بيومترية آمنة. يتم التعامل مع البيانات الحساسة وفق أفضل الممارسات الأمنية.
            </p>
            <p>
              لا تشارك مفاتيح الوصول أو بياناتك السرية. يجب استخدام HTTPS في بيئات الإنتاج وتطبيق صلاحيات قاعدة البيانات (RLS).
            </p>
            <p>
              لأغراض النسخة التجريبية قد توجد بيانات اختبارية. قبل الإطلاق الفعلي، راجع إعدادات الأمان، سياسة الاحتفاظ بالبيانات، والموافقات القانونية.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Privacy;
