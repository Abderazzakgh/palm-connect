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
import { Scan, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
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
    <div className="min-h-screen mesh-bg py-20 px-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[120px] animate-blob"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.05)_0%,transparent_70%)] pointer-events-none"></div>

      <div className="container mx-auto max-w-5xl relative z-10">
        <div className="glass-card rounded-[4rem] border-white/10 overflow-hidden p-8 md:p-16 relative">
          {/* Internal Glow */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-secondary/20 to-transparent"></div>

          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-28 h-28 mb-8 rounded-[2.5rem] bg-gradient-to-br from-secondary/20 to-primary/20 backdrop-blur-xl border border-secondary/30 shadow-[0_0_50px_rgba(251,191,36,0.2)] animate-float">
              <Scan className="h-14 w-14 text-secondary drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter uppercase italic">
              المسح <span className="text-secondary text-glow">البيومتري</span>
            </h1>
            <p className="text-xl text-white/40 font-light max-w-2xl mx-auto leading-relaxed">
              {firstTime
                ? "نظام سافانا المتطور يقوم بتحليل خرائط الأوردة وخطوط الكف بدقة متناهية لإنشاء هويتك الرقمية المشفرة."
                : "جاهز للمصادقة؟ النظام بانتظار إشارة البدء للتحقق من هويتك في قاعدة البيانات المركزية."}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-20 p-3 bg-white/5 rounded-[2.5rem] backdrop-blur-md border border-white/10 max-w-3xl mx-auto">
            {[
              { id: 1, label: "الحساب", active: true, done: true },
              { id: 2, label: "الباركود", active: true, current: true },
              { id: 3, label: "التحقق", active: !!qrCode },
              { id: 4, label: "البنك", active: false },
              { id: 5, label: "البداية", active: false }
            ].map((s) => (
              <div
                key={s.id}
                className={`flex flex-col items-center gap-3 py-5 rounded-[2rem] transition-all duration-700 ${s.current ? "bg-secondary text-primary font-black shadow-[0_10px_30px_rgba(251,191,36,0.3)] scale-110" :
                  s.done ? "text-secondary/60" : "text-white/20"
                  }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-colors ${s.current ? "border-primary bg-primary text-secondary" :
                  s.done ? "border-secondary/30 bg-secondary/5 text-secondary" : "border-white/5"
                  }`}>
                  {s.id}
                </div>
                <span className="text-[10px] uppercase font-black tracking-[0.2em]">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center justify-center gap-16">
            {!qrCode ? (
              <>
                <div className="relative group">
                  {/* Outer Glow Ring */}
                  <div className="absolute -inset-8 bg-gradient-to-r from-secondary/30 via-primary/30 to-secondary/30 rounded-full blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity duration-[2000ms]"></div>

                  <div className="relative w-80 h-80 md:w-[450px] md:h-[450px] rounded-[4rem] bg-black/60 backdrop-blur-3xl flex items-center justify-center border-2 border-white/10 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                    {deviceActive ? (
                      <>
                        <video
                          ref={videoRef}
                          className="h-full w-full object-cover grayscale-[30%] brightness-125 contrast-125"
                          playsInline
                          muted
                        />
                        {/* Digital HUD Elements */}
                        <div className="absolute inset-0 border-[3px] border-secondary/20 m-12 rounded-[3.5rem] pointer-events-none"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-secondary/40 rounded-full animate-smart-pulse"></div>

                        {/* Scanner Beam */}
                        {isScanning && (
                          <>
                            <div className="absolute inset-x-0 top-0 h-[2px] bg-secondary shadow-[0_0_30px_#fbbf24,0_0_60px_#fbbf24] animate-scan-y z-30"></div>
                            <div className="absolute inset-0 bg-secondary/5 backdrop-blur-[2px] animate-pulse"></div>
                            {/* Matrix Particles Effect (Simulated) */}
                            <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle,rgba(251,191,36,0.3)_1px,transparent_1px)] bg-[length:20px_20px] animate-matrix"></div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-8 p-12 text-center">
                        <div className="w-32 h-32 rounded-full bg-white/5 flex items-center justify-center animate-pulse border border-white/10">
                          <Scan className="h-16 w-16 text-white/5" />
                        </div>
                        <p className="text-white/20 font-black uppercase tracking-[0.3em] text-xs">
                          انتظار تفويض النظام للحساسات
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Corner Brackets */}
                  <div className="absolute -top-4 -left-4 w-12 h-12 border-t-2 border-l-2 border-secondary/50 rounded-tl-3xl"></div>
                  <div className="absolute -top-4 -right-4 w-12 h-12 border-t-2 border-r-2 border-secondary/50 rounded-tr-3xl"></div>
                  <div className="absolute -bottom-4 -left-4 w-12 h-12 border-b-2 border-l-2 border-secondary/50 rounded-bl-3xl"></div>
                  <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-2 border-r-2 border-secondary/50 rounded-br-3xl"></div>
                </div>

                <canvas ref={canvasRef} className="hidden" />

                <div className="flex flex-col items-center gap-10 w-full max-w-xl">
                  {!deviceActive ? (
                    <Button
                      onClick={async () => {
                        await startCamera();
                        setDeviceActive(true);
                        toast({ title: "✅ تم تفعيل الوحدات البصرية" });
                      }}
                      size="lg"
                      className="h-24 px-16 bg-secondary text-primary hover:bg-white hover:scale-110 transition-all duration-700 font-black text-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(251,191,36,0.3)] group"
                    >
                      تفعيل نظام التحليل
                      <ArrowRight className="mr-4 h-6 w-6 group-hover:translate-x-2 transition-transform" />
                    </Button>
                  ) : (
                    <div className="flex flex-col items-center gap-8 w-full">
                      <div className="flex gap-6 w-full">
                        <Button
                          onClick={() => {
                            const ac = new AbortController();
                            abortRef.current = ac;
                            simulatePalmScan(ac.signal);
                          }}
                          size="lg"
                          disabled={isScanning}
                          className="flex-1 h-24 bg-gradient-to-r from-secondary to-amber-400 text-primary hover:scale-105 transition-all duration-700 font-black text-2xl rounded-[2.5rem] shadow-[0_25px_60px_-15px_rgba(251,191,36,0.4)] group overflow-hidden relative"
                        >
                          <span className="relative z-10">
                            {isScanning ? (
                              <div className="flex items-center gap-4">
                                <Loader2 className="h-8 w-8 animate-spin" />
                                <span>جاري استخراج الخارطة...</span>
                              </div>
                            ) : "بدء تحليل الكف"}
                          </span>
                          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                        </Button>

                        {isScanning && (
                          <Button
                            variant="destructive"
                            onClick={() => {
                              abortRef.current?.abort();
                              setIsScanning(false);
                            }}
                            className="h-24 w-24 rounded-[2.5rem] bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all duration-700 font-black text-4xl shadow-2xl"
                          >
                            ×
                          </Button>
                        )}
                      </div>

                      {isScanning && (
                        <div className="w-full space-y-4">
                          <div className="flex justify-between text-secondary font-black text-xs uppercase tracking-[0.3em]">
                            <span className="animate-pulse">SIGNAL STRENGTH: 98%</span>
                            <span>{scanProgress}% COMPLETE</span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-4 overflow-hidden border border-white/10 p-1">
                            <div
                              className="bg-secondary h-full rounded-full transition-all duration-300 shadow-[0_0_20px_#fbbf24]"
                              style={{ width: `${scanProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <button
                        onClick={() => stopCamera()}
                        disabled={isScanning}
                        className="text-white/20 hover:text-red-500 text-[10px] font-black uppercase tracking-[0.4em] transition-all duration-500 flex items-center gap-3 py-2 px-6 rounded-full hover:bg-red-500/5 group"
                      >
                        <div className="w-2 h-2 rounded-full bg-red-500/40 group-hover:bg-red-500 transition-colors"></div>
                        إيقاف تشغيل الأجهزة
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center w-full animate-fade-up max-w-2xl">
                <div className="inline-flex items-center justify-center w-28 h-28 mb-10 rounded-[2.5rem] bg-green-500/10 border-2 border-green-500/30 shadow-[0_0_40px_rgba(34,197,94,0.2)]">
                  <CheckCircle2 className="h-14 w-14 text-green-500" />
                </div>
                <h3 className="text-5xl font-black text-white mb-6 uppercase italic tracking-tighter">اكتمل التشفير</h3>
                <p className="text-xl text-white/40 mb-16 font-light leading-relaxed">
                  تم استخراج البصمة الرقمية وربطها بنجاح مع هويتك المؤسساتية. يمكنك الآن استخدام رمز الوصول السريع أدناه.
                </p>

                <div className="glass-card p-12 rounded-[4rem] border-white/10 inline-block bg-white/5 mb-20 shadow-2xl relative group">
                  <div className="absolute -inset-4 bg-secondary/10 rounded-[4.5rem] blur-2xl group-hover:bg-secondary/20 transition-all duration-[2000ms]"></div>
                  <div className="bg-white p-10 rounded-[3rem] inline-block shadow-2xl relative">
                    <QRCodeSVG value={qrCode} size={280} />
                    <div className="absolute top-0 left-0 w-12 h-12 border-t-8 border-l-8 border-secondary rounded-tl-2xl translate-x-4 translate-y-4"></div>
                    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-8 border-r-8 border-secondary rounded-br-2xl -translate-x-4 -translate-y-4"></div>
                  </div>
                </div>

                <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
                  <Button
                    onClick={() => navigate("/barcode")}
                    size="lg"
                    className="h-24 px-16 bg-secondary text-primary hover:bg-white hover:scale-105 transition-all duration-700 font-black text-2xl rounded-[2.5rem] shadow-2xl shadow-secondary/20"
                  >
                    متابعة للتحقق النهائي
                    <ArrowRight className="mr-4 h-7 w-7" />
                  </Button>
                  <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.5em]">REDIRECTING IN 2.0s</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scanner;
