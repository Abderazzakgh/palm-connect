import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, User, Phone, CreditCard, Building2, Fingerprint } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface ProfileInfoProps {
  profile: Tables<'user_profiles'>;
}

const ProfileInfo = ({ profile }: ProfileInfoProps) => {
  return (
    <div className="space-y-6">
  <Card className="border-2 border-primary bg-background">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl flex items-center text-primary">
              <CheckCircle2 className="ml-2 h-6 w-6 text-secondary" />
              حسابك مكتمل!
            </CardTitle>
            <Badge className="bg-secondary text-secondary-foreground border border-primary">مفعّل</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg">
              <User className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">الاسم</p>
                <p className="font-medium">{profile.full_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg">
              <Phone className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">الهاتف</p>
                <p className="font-medium" dir="ltr">{profile.phone}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">البنك</p>
                <p className="font-medium">{profile.bank_name}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg">
              <CreditCard className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">البطاقة</p>
                <p className="font-medium" dir="ltr">**** {profile.atm_card_last_4}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-secondary/10 rounded-lg border-2 border-secondary">
            <div className="flex items-center gap-3">
              <Fingerprint className="h-6 w-6 text-secondary" />
              <div>
                <p className="font-semibold text-secondary">بصمة الكف مربوطة</p>
                <p className="text-sm text-primary">
                  تم ربط بصمة الكف بحسابك بنجاح
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-primary to-secondary p-6 rounded-lg text-center">
            <h3 className="text-xl font-semibold mb-2">🎉 مبروك!</h3>
            <p className="text-muted-foreground">
              حسابك مكتمل ويمكنك الآن استخدام المصادقة البيومترية لجميع معاملاتك
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileInfo;