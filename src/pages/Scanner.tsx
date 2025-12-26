import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";
import { Scan, CheckCircle2, Loader2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

// --- Types ---
type PalmStatus = "active" | "used" | "expired";

interface PalmPrint {
  id: string;
  palm_hash: string;
  qr_code: string;
  image_url?: string | null;
  status: PalmStatus;
  expires_at: string;
  used_at?: string;
  matched_user_id?: string | null;
}

// --- Utils ---
const generateRandomHash = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

const Scanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [deviceActive, setDeviceActive] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [firstTime, setFirstTime] = useState(true);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // --- Camera control ---
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e) {
      toast({ title: "خطأ بالكاميرا", description: String(e), variant: "destructive" });
      throw e;
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (stream) stream.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setDeviceActive(false);
  };

  // --- Scan sound (0.8s) ---
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playScanSound = () => {
    try {
      const webkit = (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      const ctx = audioCtxRef.current || new (window.AudioContext || webkit)();
      audioCtxRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.linearRampToValueAtTime(1200, now + 0.8);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.8);
    } catch (e) {
      console.warn("Audio error:", e);
    }
  };

  // --- Simulate Palm Scan ---
  const simulatePalmScan = async (signal?: AbortSignal) => {
    if (!deviceActive) {
      toast({
        title: "يرجى تفعيل الجهاز",
        description: 'اضغط "فعل الجهاز" للبدء',
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    playScanSound();

    const totalMs = 2500;
    const stepMs = 50;
    let elapsed = 0;

    while (elapsed < totalMs) {
      if (signal?.aborted) {
        setIsScanning(false);
        setScanProgress(0);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, stepMs));
      elapsed += stepMs;
      setScanProgress(Math.min(100, Math.round((elapsed / totalMs) * 100)));
    }

    try {
      // التحقق من المستخدم
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !currentUser) {
        throw new Error('يرجى تسجيل الدخول أولاً');
      }

      const palmHash = generateRandomHash("PALM");
      const qrCodeData = generateRandomHash("BIOMETRIC");
      let imageUrl: string | null = null;

      // التقاط صورة من الكاميرا
      if (videoRef.current && videoRef.current.srcObject) {
        const video = videoRef.current;
        const canvas = canvasRef.current || document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/png")
          );
          
          if (blob) {
            const fileName = `palm_scans/${palmHash}.png`;
            const { error: uploadError } = await supabase.storage
              .from("palm_scans")
              .upload(fileName, blob, { upsert: true });
            
            if (!uploadError) {
              const { data: { publicUrl } } = supabase.storage
                .from("palm_scans")
                .getPublicUrl(fileName);
              imageUrl = publicUrl || null;
              setImagePreview(imageUrl);
            }
          }
        }
      }

      // إنشاء سجل البصمة
      const { data: palmData, error: insertError } = await supabase
        .from("palm_prints")
        .insert({
          palm_hash: palmHash,
          qr_code: qrCodeData,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          status: "completed",
          matched_user_id: currentUser.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // تحديث الحالة
      setQrCode(qrCodeData);
      localStorage.setItem("palm_registered", "1");
      localStorage.setItem("created_qr", qrCodeData);
      if (palmData?.id) localStorage.setItem("created_palm_id", String(palmData.id));
      setFirstTime(false);
      
      toast({ 
        title: '✅ تم إنشاء البصمة بنجاح', 
        description: 'البصمة مسجلة ومرتبطة بحسابك',
        duration: 2000
      });
      
      // التوجيه إلى صفحة التحقق
      setTimeout(() => navigate('/barcode'), 2000);
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "حدث خطأ أثناء مسح بصمة الكف";
      console.error('خطأ في مسح بصمة الكف:', error);
      
      toast({ 
        title: "❌ خطأ أثناء المسح", 
        description: errorMessage,
        variant: "destructive" 
      });
    } finally {
      setIsScanning(false);
      setScanProgress(0);
    }
  };

  // --- Lifecycle ---
  useEffect(() => {
    (async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) { 
        navigate('/auth'); 
        return; 
      }
      
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*, palm_prints(*)')
        .eq('user_id', user.id)
        .maybeSingle();

      const prof = profile as unknown as (Tables<'user_profiles'> & { palm_prints?: Tables<'palm_prints'>[] }) | null;
      const hasPalmLinked = !!prof?.palm_print_id || ((prof?.palm_prints?.length ?? 0) > 0);

      if (hasPalmLinked) {
        toast({ title: 'مرحلتك التالية', description: 'يرجى إكمال معلوماتك الشخصية والبنكية', variant: 'default' });
        navigate('/dashboard');
        return;
      }

      const reg = localStorage.getItem('palm_registered');
      setFirstTime(!reg);
    })();
    return () => stopCamera();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <Card className="shadow-2xl border-2 border-primary/20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5"></div>
          
          <CardHeader className="text-center relative z-10 pb-6">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg">
                <Scan className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              جهاز مسح بصمة الكف
            </CardTitle>
            <CardDescription className="text-lg mt-2 text-muted-foreground">
              {firstTime
                ? "مرر كف يدك على الجهاز لأول مرة لتسجيل البصمة"
                : "مرر كف يدك على الجهاز لبدء المسح"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6 text-center relative z-10">
            <div className="grid gap-2 mb-4 md:grid-cols-5">
              <Button variant="default" disabled className="justify-start bg-primary/20 hover:bg-primary/30">
                <span className="flex items-center gap-1">
                  1) إنشاء حساب
                </span>
              </Button>
              <Button variant="default" className="justify-start bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90" onClick={() => navigate('/scanner')}>
                <span className="flex items-center gap-1">
                  2) إنشاء الباركود
                </span>
              </Button>
              <Button variant={(qrCode ? 'default' : 'secondary')} className="justify-start bg-gradient-to-r from-secondary to-primary text-white hover:opacity-90" onClick={() => navigate('/barcode')}>
                <span className="flex items-center gap-1">
                  3) قراءة الباركود
                </span>
              </Button>
              <Button variant="secondary" className="justify-start bg-secondary/20 hover:bg-secondary/30" onClick={() => navigate('/dashboard')}>
                <span className="flex items-center gap-1">
                  4) إكمال الملف
                </span>
              </Button>
              <Button variant="secondary" disabled className="justify-start bg-primary/10">
                <span className="flex items-center gap-1">
                  5) البدء بالاستخدام
                </span>
              </Button>
            </div>
            
            {!qrCode ? (
              <>
                <div className="relative w-80 h-80 mx-auto rounded-3xl bg-gradient-to-br from-primary/30 via-primary/10 to-secondary/10 flex items-center justify-center border-4 border-primary/30 overflow-hidden shadow-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10"></div>
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiM5QzkyQUMiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
                  
                  {deviceActive ? (
                    <video
                      ref={videoRef}
                      className="h-full w-full object-cover rounded-3xl"
                      playsInline
                      muted
                    />
                  ) : (
                    <div className="relative z-10 flex flex-col items-center gap-4">
                      <Scan className="h-24 w-24 text-primary/40" />
                      <p className="text-lg text-muted-foreground text-center px-4">
                        الكاميرا غير مفعلة
                      </p>
                    </div>
                  )}
                  
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 border-4 border-dashed border-primary/30 rounded-3xl"></div>
                  </div>
                </div>

                <canvas ref={canvasRef} className="hidden" />

                {imagePreview && (
                  <div className="relative mx-auto mt-4 w-48 h-48 rounded-xl border-2 border-primary/20 overflow-hidden shadow-lg">
                    <img
                      src={imagePreview}
                      className="w-full h-full object-cover"
                      alt="معاينة الصورة"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                  </div>
                )}

                <div className="flex flex-col items-center gap-3">
                  {!deviceActive ? (
                    <Button
                      onClick={async () => {
                        await startCamera();
                        setDeviceActive(true);
                        toast({
                          title: "✅ تم تفعيل الجهاز",
                          description: "يمكنك الآن بدء المسح",
                        });
                      }}
                      size="lg"
                      className="bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 px-8"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span>فعل الجهاز</span>
                      </div>
                    </Button>
                  ) : (
                    <div className="flex flex-col items-center gap-4 w-full">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            const ac = new AbortController();
                            abortRef.current = ac;
                            simulatePalmScan(ac.signal).catch(
                              (e) => e === "scan-aborted" && toast({ title: "أُلغي المسح" })
                            );
                          }}
                          size="lg"
                          disabled={isScanning}
                          className="bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 px-8 min-w-40"
                        >
                          {isScanning ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="ml-2 h-5 w-5 animate-spin" /> جاري المسح...
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Scan className="ml-2 h-5 w-5" />
                              <span>ابدأ المسح</span>
                            </div>
                          )}
                        </Button>
                        
                        {isScanning && (
                          <Button
                            variant="destructive"
                            onClick={() => {
                              abortRef.current?.abort();
                              setIsScanning(false);
                              setScanProgress(0);
                            }}
                            className="px-4"
                          >
                            <span>إلغاء</span>
                          </Button>
                        )}
                      </div>
                      
                      {isScanning && (
                        <div className="w-full max-w-md px-4">
                          <div className="w-full bg-primary/20 rounded-full h-3 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-primary to-secondary h-full transition-all duration-300 ease-out"
                              style={{ width: `${scanProgress}%` }}
                            />
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">{scanProgress}%</p>
                        </div>
                      )}
                      
                      <Button 
                        variant="outline" 
                        onClick={() => stopCamera()} 
                        disabled={isScanning}
                        className="border-secondary text-secondary hover:bg-secondary/10"
                      >
                        <div className="flex items-center gap-2">
                          <span>إيقاف الكاميرا</span>
                        </div>
                      </Button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-6 py-6">
                <div className="flex justify-center">
                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-green-600 mb-2">✅ تم التسجيل بنجاح!</h3>
                  <p className="text-muted-foreground mb-6">
                    بصمة الكف مسجلة ومرتبطة بحسابك
                  </p>
                </div>
                
                <div className="bg-card/50 backdrop-blur-sm p-6 rounded-xl border border-primary/20 inline-block mx-auto">
                  <p className="mb-4 text-muted-foreground text-center">
                    احفظ هذا الباركود لربطه بحسابك
                  </p>
                  <div className="bg-white p-4 rounded-lg inline-block shadow-lg">
                    <QRCodeSVG value={qrCode} size={180} />
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    <Button 
                      onClick={() => navigate("/barcode")} 
                      size="lg"
                      className="bg-gradient-to-r from-secondary to-primary text-white hover:opacity-90"
                    >
                      <div className="flex items-center gap-2">
                        <Scan className="ml-2 h-5 w-5" />
                        <span>قراءة الباركود</span>
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Scanner;
