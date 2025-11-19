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
      if (signal?.aborted) throw new Error("scan-aborted");
      await new Promise((resolve) => setTimeout(resolve, stepMs));
      elapsed += stepMs;
      setScanProgress(Math.min(100, Math.round((elapsed / totalMs) * 100)));
    }

    try {
      const palmHash = generateRandomHash("PALM");
      const qrCodeData = generateRandomHash("BIOMETRIC");
      let imageUrl: string | null = null;

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id ?? null;

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
            const { error } = await supabase.storage
              .from("palm_scans")
              .upload(fileName, blob, { upsert: true });
            if (!error) {
              const publicUrl = supabase.storage
                .from("palm_scans")
                .getPublicUrl(fileName).data.publicUrl;
              imageUrl = publicUrl || null;
              setImagePreview(imageUrl);
            }
          }
        }
      }

      const { data: palmData, error: insertError } = await supabase
        .from("palm_prints")
        .insert({
          palm_hash: palmHash,
          qr_code: qrCodeData,
          image_url: imageUrl,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          status: "pending",
          matched_user_id: userId,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        toast({ title: "لم يتم العثور على مستخدم مسجل الدخول", description: "يرجى تسجيل الدخول أولاً.", variant: "destructive" });
        return;
      }

      setQrCode(qrCodeData);
      localStorage.setItem("palm_registered", "1");
      localStorage.setItem("created_qr", qrCodeData);
      if (palmData?.id) localStorage.setItem("created_palm_id", String(palmData.id));
      setFirstTime(false);
      toast({ title: "تم إنشاء الباركود", description: "استخدم قارئ الباركود لربطه بالحساب" });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "حدث خطأ أثناء المسح";
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    } finally {
      setIsScanning(false);
      setScanProgress(0);
    }
  };

  // --- Lifecycle ---
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
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
        <Card className="shadow-lg border-2 border-primary/10">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl mb-2">جهاز مسح بصمة الكف</CardTitle>
            <CardDescription className="text-lg">
              {firstTime
                ? "مرر كف يدك على الجهاز لأول مرة لتسجيل البصمة"
                : "مرر كف يدك على الجهاز لبدء المسح"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="grid gap-2 mb-4 md:grid-cols-5">
              <Button variant="default" disabled className="justify-start">1) إنشاء حساب</Button>
              <Button variant="default" className="justify-start" onClick={() => navigate('/scanner')}>2) إنشاء الباركود</Button>
              <Button variant={(qrCode ? 'default' : 'secondary')} className="justify-start" onClick={() => navigate('/barcode')}>3) قراءة الباركود</Button>
              <Button variant="secondary" className="justify-start" onClick={() => navigate('/dashboard')}>4) إكمال الملف</Button>
              <Button variant="secondary" disabled className="justify-start">5) البدء بالاستخدام</Button>
            </div>
            {!qrCode ? (
              <>
                <div className="relative w-80 h-80 mx-auto rounded-3xl bg-gradient-to-br from-primary/30 via-primary/10 to-secondary/10 flex items-center justify-center border-4 border-primary/30 overflow-hidden shadow-2xl">
                  {deviceActive ? (
                    <video
                      ref={videoRef}
                      className="h-full w-full object-cover rounded-3xl"
                      playsInline
                      muted
                    />
                  ) : (
                    <Scan className="h-24 w-24 text-primary/30" />
                  )}
            
                </div>

                <canvas ref={canvasRef} className="hidden" />


                {imagePreview && (
                  <img
                    src={imagePreview}
                    className="mx-auto mt-4 w-48 h-48 rounded-xl border"
                    alt="معاينة الصورة"
                  />
                )}

                <div className="flex flex-col items-center gap-3">
                  {!deviceActive ? (
                    <Button
                      onClick={async () => {
                        await startCamera();
                        setDeviceActive(true);
                        toast({
                          title: "تم تفعيل الجهاز",
                          description: "يمكنك الآن بدء المسح",
                        });
                      }}
                      size="lg"
                    >
                      فعل الجهاز
                    </Button>
                  ) : (
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
                      >
                        {isScanning ? (
                          <>
                            <Loader2 className="ml-2 h-5 w-5 animate-spin" /> جاري المسح...
                          </>
                        ) : (
                          "ابدأ المسح"
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
                        >
                          إلغاء
                        </Button>
                      )}
                      <Button variant="ghost" onClick={() => stopCamera()} disabled={isScanning}>
                        إيقاف الكاميرا
                      </Button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <CheckCircle2 className="h-16 w-16 mx-auto text-secondary" />
                <h3 className="text-2xl font-semibold text-secondary">تم التسجيل بنجاح!</h3>
                <div className="bg-card p-8 rounded-lg border-2 border-secondary/20 inline-block">
                  <p className="mb-4 text-muted-foreground">
                    احفظ هذا الباركود لربطه بحسابك
                  </p>
                  <div className="bg-white p-6 rounded-lg inline-block">
                    <QRCodeSVG value={qrCode} size={200} />
                  </div>
                  <div className="mt-4 flex flex-col gap-2">
                    <Button onClick={() => navigate("/barcode")} size="default">
                      قراءة الباركود
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
