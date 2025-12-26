import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

const Contact = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-3xl">
        <Button variant="outline" onClick={() => navigate("/")} className="mb-6">
          العودة للرئيسية
        </Button>

        <Card className="shadow-lg border-2 border-primary/10">
          <CardHeader>
            <CardTitle className="text-3xl">تواصل معنا</CardTitle>
            <CardDescription>
              قنوات التواصل والدعم
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              إذا واجهت مشكلة أو تحتاج مساعدة في الإعداد أو التشغيل، يمكنك التواصل عبر البريد الإلكتروني.
            </p>
            <p className="font-medium text-foreground" dir="ltr">
              support@savanna.tn
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Contact;
