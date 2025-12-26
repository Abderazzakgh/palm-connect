import { useEffect, useRef, useState, useCallback, ChangeEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, Camera, Upload, Image, Zap } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose?: () => void;
  autoStart?: boolean;
  showControls?: boolean;
}

const QRScanner = ({ onScanSuccess, autoStart = true }: QRScannerProps) => {
  const [status, setStatus] = useState<'loading' | 'ready' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [scanMode, setScanMode] = useState<'camera' | 'image'>('camera');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasScannedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  // صوت النجاح
  const playSuccessSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 1000;
      gain.gain.value = 0.15;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => { osc.stop(); ctx.close(); }, 200);
    } catch { void 0; }
  };

  // معالجة النجاح
  const handleSuccess = useCallback((text: string) => {
    if (hasScannedRef.current) return;
    hasScannedRef.current = true;
    
    console.log("✅ قراءة ذكية ناجحة:", text);
    playSuccessSound();
    setStatus('success');
    
    // إيقاف الماسح
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
    }
    
    // تنفيذ الـ callback
    setTimeout(() => onScanSuccess(text), 300);
  }, [onScanSuccess]);

  // بدء المسح التلقائي
  const startAutoScan = useCallback(async () => {
    try {
      setStatus('loading');
      setErrorMsg('');
      
      // الحصول على الكاميرات
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras || cameras.length === 0) {
        throw new Error('لم يتم العثور على كاميرا');
      }
      
      // اختيار الكاميرا الخلفية
      const backCam = cameras.find(c => 
        c.label.toLowerCase().includes('back') || 
        c.label.toLowerCase().includes('rear') ||
        c.label.toLowerCase().includes('environment')
      );
      const camId = backCam?.id || cameras[cameras.length - 1].id;
      
      // إنشاء الماسح
      const scanner = new Html5Qrcode("smart-scanner", { verbose: false });
      scannerRef.current = scanner;
      
      // بدء المسح
      await scanner.start(
        camId,
        {
          fps: 30,
          qrbox: (w, h) => {
            const size = Math.floor(Math.min(w, h) * 0.8);
            return { width: size, height: size };
          },
          aspectRatio: 1.0,
          disableFlip: false,
          formatsToSupport: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
          experimentalFeatures: { useBarCodeDetectorIfSupported: true }
        },
        handleSuccess,
        () => {} // تجاهل أخطاء "لم يتم العثور"
      );
      
      setStatus('ready');
      
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ';
      console.error("خطأ:", msg);
      
      if (msg.includes('Permission') || msg.includes('NotAllowed')) {
        setErrorMsg('يرجى السماح بالوصول للكاميرا');
      } else if (msg.includes('NotFound') || msg.includes('كاميرا')) {
        setErrorMsg('لم يتم العثور على كاميرا');
      } else {
        setErrorMsg(msg);
      }
      setStatus('error');
    }
  }, [handleSuccess]);

  // التشغيل التلقائي عند فتح الصفحة
  useEffect(() => {
    if (autoStart) {
      startAutoScan();
    }
    
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [autoStart, startAutoScan]);

  // معالجة رفع الصورة
  const handleImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    try {
      setUploadStatus('uploading');
      setUploadProgress(10);
      
      // التحقق من نوع الملف
      if (!file.type.startsWith('image/')) {
        throw new Error('الرجاء اختيار ملف صورة صالح');
      }
      
      // تحميل الصورة إلى Supabase Storage
      const fileName = `palm_scans/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('palm_scans')
        .upload(fileName, file, { upsert: true });
      
      if (error) throw error;
      
      setUploadProgress(30);
      
      // الحصول على رابط الصورة
      const { data: { publicUrl } } = supabase.storage
        .from('palm_scans')
        .getPublicUrl(fileName);
      
      setUploadProgress(50);
      
      // إرسال الصورة لتحليل الذكاء الاصطناعي
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('يرجى تسجيل الدخول أولاً');
      }
      
      const response = await fetch('http://localhost:5000/api/palm-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: publicUrl,
          userId: user.id
        })
      });
      
      setUploadProgress(80);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'خطأ في تحليل الصورة');
      }
      
      const result = await response.json();
      
      setUploadProgress(100);
      setUploadStatus('success');
      
      // معالجة النتيجة
      if (result.isValid && result.palmHash) {
        console.log('✅ تحليل بصمة الكف ناجح:', result.palmHash);
        handleSuccess(result.palmHash);
      } else {
        throw new Error('لم يتم التعرف على بصمة الكف');
      }
      
    } catch (err) {
      console.error('خطأ في تحليل الصورة:', err);
      setErrorMsg(err instanceof Error ? err.message : 'خطأ في تحليل الصورة');
      setUploadStatus('error');
      setStatus('error');
      
      toast({
        title: '❌ خطأ في التحليل',
        description: err instanceof Error ? err.message : 'خطأ غير معروف',
        variant: 'destructive',
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // العودة للكاميرا
  const switchToCamera = () => {
    setScanMode('camera');
    hasScannedRef.current = false;
    setUploadStatus('idle');
    setErrorMsg('');
    setStatus('loading');
    startAutoScan();
  };

  // بدء مسح بصمة الكف
  const startPalmScan = async () => {
    try {
      setStatus('loading');
      setScanMode('camera');
      
      // التحقق من إذن الكاميرا
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      
      startAutoScan();
    } catch (err) {
      setErrorMsg('يرجى السماح بالوصول للكاميرا');
      setStatus('error');
      toast({
        title: '❌ إذن الكاميرا مطلوب',
        description: 'الرجاء السماح بالوصول للكاميرا لمسح بصمة الكف',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full overflow-hidden shadow-2xl border-2 border-primary/20">
      <CardContent className="p-0">
          
        {/* أزرار التبديل */}
        <div className="flex border-b border-primary/10">
          <button
            onClick={startPalmScan}
            className={`flex-1 py-4 px-4 flex items-center justify-center gap-2 font-bold transition-all ${
              scanMode === 'camera' 
                ? 'bg-primary text-white' 
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            <Camera className="h-5 w-5" />
            📸 مسح بصمة الكف
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex-1 py-4 px-4 flex items-center justify-center gap-2 font-bold transition-all ${
              scanMode === 'image' 
                ? 'bg-secondary text-primary' 
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            <Upload className="h-5 w-5" />
            🖼️ رفع صورة
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </div>
          
        {/* حالة تحميل الصورة */}
        {uploadStatus !== 'idle' && (
          <div className="p-6 bg-gradient-to-r from-secondary/10 to-primary/10 border-b border-secondary/20">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-primary">
                  {uploadStatus === 'uploading' && 'جاري رفع الصورة...'}
                  {uploadStatus === 'analyzing' && 'جاري تحليل بصمة الكف...'}
                  {uploadStatus === 'success' && 'تم التحليل بنجاح!'}
                  {uploadStatus === 'error' && 'حدث خطأ'}
                </span>
                <Zap className="h-5 w-5 text-secondary" />
              </div>
                
              {uploadStatus !== 'success' && uploadStatus !== 'error' && (
                <div className="w-full bg-primary/20 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-secondary to-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
                
              {uploadStatus === 'success' && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>تم التعرف على بصمة الكف بنجاح</span>
                </div>
              )}
                
              {uploadStatus === 'error' && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-5 w-5" />
                  <span>خطأ في التحليل</span>
                </div>
              )}
            </div>
          </div>
        )}
          
        {/* منطقة الكاميرا */}
        <div className="relative bg-black" style={{ minHeight: 400 }}>
          
          {/* الكاميرا */}
          <div id="smart-scanner" className="w-full" />
          
          {/* الإطار الذكي */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative" style={{ width: 280, height: 280 }}>
              
              {/* الإطار الرئيسي */}
              <div className={`absolute inset-0 border-4 rounded-2xl transition-all duration-500 ${
                status === 'ready' ? 'border-secondary shadow-[0_0_30px_rgba(234,179,8,0.5)] animate-pulse' :
                status === 'success' ? 'border-green-500 shadow-[0_0_40px_rgba(34,197,94,0.6)]' :
                'border-white/30'
              }`} />
              
              {/* الزوايا */}
              <div className="absolute -top-2 -left-2 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-xl" />
              <div className="absolute -top-2 -right-2 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-xl" />
              <div className="absolute -bottom-2 -left-2 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-xl" />
              <div className="absolute -bottom-2 -right-2 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-xl" />
              
              {/* خط المسح المتحرك */}
              {status === 'ready' && (
                <div className="absolute inset-x-2 h-1 bg-gradient-to-r from-transparent via-secondary to-transparent rounded animate-scan" />
              )}
            </div>
          </div>
          
          {/* الرسائل */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            
            {status === 'loading' && (
              <div className="flex items-center justify-center gap-3 text-white">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-lg font-bold">جاري فتح الكاميرا...</span>
              </div>
            )}
            
            {status === 'ready' && (
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-3 w-3 bg-secondary rounded-full animate-ping" />
                  <span className="text-xl font-bold text-secondary">📸 وجّه الكاميرا نحو الباركود</span>
                </div>
                <p className="text-white/70 text-sm">سيتم القراءة تلقائياً بذكاء</p>
              </div>
            )}
            
            {status === 'success' && (
              <div className="flex items-center justify-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-500 animate-bounce" />
                <span className="text-2xl font-bold text-green-500">✅ تمت القراءة!</span>
              </div>
            )}
            
            {status === 'error' && (
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-red-400">
                  <AlertCircle className="h-6 w-6" />
                  <span className="font-bold">{errorMsg}</span>
                </div>
                <button 
                  onClick={startAutoScan}
                  className="px-6 py-2 bg-secondary text-primary font-bold rounded-xl hover:bg-secondary/90 transition-all flex items-center gap-2 mx-auto"
                >
                  <Camera className="h-5 w-5" />
                  إعادة المحاولة
                </button>
              </div>
            )}
            
          </div>
        </div>
        
        {/* شريط المعلومات */}
        <div className="p-4 bg-gradient-to-r from-primary/10 via-secondary/10 to-primary/10 border-t border-primary/20">
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-primary font-semibold">
              <CheckCircle2 className="h-4 w-4 text-secondary" />
              قراءة ذكية
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">17+ نوع باركود</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">تلقائي 100%</span>
          </div>
        </div>
        
      </CardContent>
    </Card>
  );
};

export default QRScanner;
