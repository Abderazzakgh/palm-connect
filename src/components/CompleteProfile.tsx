import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, Phone, CreditCard, Building2 } from "lucide-react";
import { z } from "zod";
import { callEdgeFunction, getSupabaseConfig } from "@/utils/edgeFunctions";

const profileSchema = z.object({
  fullName: z.string().min(3, { message: "الاسم يجب أن يكون 3 أحرف على الأقل" }),
  phone: z.string().min(10, { message: "رقم الهاتف يجب أن يكون 10 أرقام على الأقل" }),
  atmCardLast4: z.string().length(4, { message: "أدخل آخر 4 أرقام من البطاقة" }),
  bankName: z.string().min(2, { message: "اسم البنك مطلوب" }),
});

interface CompleteProfileProps {
  userId: string;
  onComplete: () => void;
}

const CompleteProfile = ({ userId, onComplete }: CompleteProfileProps) => {
  // Camera & encryption states (مرحلة 1)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [encrypting, setEncrypting] = useState(false);
  const [encryptedPayload, setEncryptedPayload] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    atmCardLast4: "",
    bankName: "",
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      profileSchema.parse(formData);
    } catch (error: unknown) {
      const msg = error instanceof z.ZodError
        ? error.errors[0]?.message || "يرجى التحقق من البيانات المدخلة"
        : "يرجى التحقق من البيانات المدخلة";
      toast({ title: "خطأ في البيانات", description: msg, variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert(
          {
            user_id: userId,
            full_name: formData.fullName,
            phone: formData.phone,
            atm_card_last_4: formData.atmCardLast4,
            bank_name: formData.bankName,
          },
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      toast({ title: "تم بنجاح!", description: "تم حفظ بياناتك" });
      
      onComplete();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "حدث خطأ أثناء الحفظ";
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ------------------ مرحلة 1: التقاط الصورة أو الميزة ------------------
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "خطأ بالكاميرا", description: msg, variant: "destructive" });
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream | undefined;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/png");
    setCapturedImage(dataUrl);
    // stop camera automatically after capture
    stopCamera();
  };

  // Simple helper to convert base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  // Client-side AES-GCM encryption for demo purposes.
  // Client-side AES-GCM encryption for demo purposes.
  //
  // SECURITY NOTE (important):
  // - This demo generates an ephemeral AES-GCM key locally and DOES NOT transmit or wrap that key.
  // - In a production system the client must securely share the symmetric key with the server so the
  //   server can decrypt the payload. Two common patterns:
  //     1) RSA key-wrap: server exposes a stable RSA public key; client generates AES key and encrypts
  //        (wraps) it with the server public key (RSA-OAEP). Server unwraps with its private key.
  //     2) ECDH key agreement: client and server perform an ECDH exchange (e.g. X25519). They derive a
  //        shared symmetric key to use for AES-GCM. This is preferred for forward secrecy.
  // - Also ensure TLS is used for transport-level confidentiality even when application-level
  //   encryption is in place.
  //
  // Next steps (recommended):
  // - Choose a key-exchange method (ECDH recommended). Implement key negotiation endpoints on the server
  //   and update the client to perform the agreement and derive the AES key.
  // - Export and wrap/unwrap keys as needed, then send { iv, ciphertext, keyWrap (if RSA) } to the server.
  // - On the server, validate and decrypt, then forward features to the Algorithm Service.
  // - Consider signing the payload or adding an HMAC for integrity/authentication.

  // NOTE: This demo DOES NOT implement secure key exchange. Server-side decryption requires a secure key exchange/management.
  const encryptCapturedImage = async () => {
    if (!capturedImage) return;
    setEncrypting(true);
    setEncryptedPayload(null);
    try {
      // Convert data URL to ArrayBuffer
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const arrayBuffer = await blob.arrayBuffer();

      // Generate ephemeral AES-GCM key
      const key = await window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      const ciphertext = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, arrayBuffer);

      // For demonstration, we encode ciphertext and iv in base64 and show as encrypted data (highlighted in blue)
      const encoded = JSON.stringify({
        iv: arrayBufferToBase64(iv.buffer),
        ciphertext: arrayBufferToBase64(ciphertext),
        // key not exported/sent in this demo. In a real system, use server public key to wrap the AES key or perform a key agreement (ECDH) to securely share the key.
      });

      setEncryptedPayload(encoded);
      toast({ title: "تم التشفير (تجريبي)", description: "البيانات مشفّرة محلياً. أرسلها للخادم." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: "خطأ بالتشفير", description: msg, variant: "destructive" });
    } finally {
      setEncrypting(false);
    }
  };

  const uploadEncrypted = async () => {
    if (!encryptedPayload) {
      toast({ title: "لا يوجد بيانات مشفّرة", description: "يرجى التقاط الصورة وتشفيرها أولاً", variant: "destructive" });
      return;
    }
    setUploadStatus("uploading");
    try {
      // Get Supabase configuration
      const config = getSupabaseConfig();
      if (config.error) {
        throw new Error(config.error);
      }

      // Parse encrypted payload to ensure it's in the correct format
      let payloadToSend;
      try {
        payloadToSend = typeof encryptedPayload === 'string' ? JSON.parse(encryptedPayload) : encryptedPayload;
      } catch {
        // If it's already an object, use it directly
        payloadToSend = encryptedPayload;
      }

      // Call Edge Function
      const result = await callEdgeFunction('vein-upload', {
        method: 'POST',
        body: { userId, payload: payloadToSend },
        supabaseUrl: config.url,
        anonKey: config.anonKey,
      });

      if (!result.success) {
        const errorMsg = result.error?.details || result.error?.message || 'حدث خطأ غير معروف';
        throw new Error(errorMsg);
      }

      setUploadStatus('done');
      const serverMsg = (result.data as { message?: string } | undefined)?.message;
      toast({ title: 'تم الإرسال بنجاح', description: serverMsg || 'تم رفع الصورة المشفرة إلى الخادم بنجاح' });
    } catch (err: unknown) {
      setUploadStatus('error');
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'خطأ بالإرسال', description: msg, variant: 'destructive' });
    }
  };

  // Secure upload using ECDH (P-256) + HKDF + AES-GCM
  const secureUploadEncrypted = async () => {
    if (!capturedImage) {
      toast({ title: 'لا توجد صورة', description: 'التقط صورة أولاً', variant: 'destructive' });
      return;
    }

    setUploadStatus('uploading');
    try {
      // Get Supabase configuration
      const config = getSupabaseConfig();
      if (config.error) {
        throw new Error(config.error);
      }

  // 1) Perform handshake to get server public key, salt, and keyId
      const handshakeResult = await callEdgeFunction('handshake', {
        method: 'GET',
        supabaseUrl: config.url,
        anonKey: config.anonKey,
      });

      if (!handshakeResult.success) {
        const errorMsg = handshakeResult.error?.details || handshakeResult.error?.message || 'فشل في الحصول على handshake';
        throw new Error(errorMsg);
      }

      const handshakeData = handshakeResult.data as { publicKey?: string; salt?: string; keyId?: string } | undefined;
      const serverPubBase64 = handshakeData?.publicKey;
      const saltBase64 = handshakeData?.salt;
      const keyId = handshakeData?.keyId;
      
      if (!serverPubBase64 || !saltBase64 || !keyId) {
        throw new Error('استجابة handshake غير صحيحة. تأكد من أن Edge Function يعمل بشكل صحيح.');
      }

      // 2) Convert captured image to ArrayBuffer
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const arrayBuffer = await blob.arrayBuffer();

      // 3) Generate client ECDH key pair (P-256)
      const clientKeyPair = await window.crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);

      // 4) Import server public key (raw)
      const serverPubRaw = Uint8Array.from(atob(serverPubBase64), c => c.charCodeAt(0));
      const serverPubKey = await window.crypto.subtle.importKey('raw', serverPubRaw.buffer, { name: 'ECDH', namedCurve: 'P-256' }, false, []);

  // 5) Derive shared secret (deriveBits) and HKDF to AES key, using server-provided salt
  const sharedBits = await window.crypto.subtle.deriveBits({ name: 'ECDH', public: serverPubKey }, clientKeyPair.privateKey, 256);
  const baseKey = await window.crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey']);
  const salt = saltBase64 ? Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0)) : new Uint8Array([]);
  const info = new TextEncoder().encode('savanna-derive-aes-key');
  const aesKey = await window.crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt, info }, baseKey, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);

      // 6) Encrypt image with AES-GCM
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, arrayBuffer);

      // 7) Export client public key (raw)
      const clientPubRaw = await window.crypto.subtle.exportKey('raw', clientKeyPair.publicKey);

      // 8) Send secure payload to server
      const body = {
        userId,
        payload: {
          iv: arrayBufferToBase64(iv.buffer),
          ciphertext: arrayBufferToBase64(ciphertext),
        },
        clientPub: arrayBufferToBase64(clientPubRaw),
        keyId,
      };

      // 8) Send secure payload to server
      const uploadResult = await callEdgeFunction('vein-secure-upload', {
        method: 'POST',
        body,
        supabaseUrl: config.url,
        anonKey: config.anonKey,
      });

      if (!uploadResult.success) {
        const errorMsg = uploadResult.error?.details || uploadResult.error?.message || 'حدث خطأ أثناء الرفع';
        throw new Error(errorMsg);
      }

      setUploadStatus('done');
      const serverMsg = (uploadResult.data as { message?: string } | undefined)?.message;
      toast({ title: 'تم الإرسال الآمن بنجاح', description: serverMsg || 'تم رفع الصورة المشفرة بشكل آمن إلى الخادم' });
    } catch (err: unknown) {
      setUploadStatus('error');
      const msg = err instanceof Error ? err.message : String(err);
      toast({ title: 'خطأ بالإرسال الآمن', description: msg, variant: 'destructive' });
    }
  };

  useEffect(() => {
    // cleanup on unmount
    return () => stopCamera();
  }, []);
  // -------------------------------------------------------------------

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">أكمل بياناتك الشخصية</CardTitle>
        <CardDescription>
          أدخل معلوماتك لإكمال التسجيل وربط بطاقتك البنكية
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* مرحلة 1: التقاط الصورة أو الميزة */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">مرحلة 1 — التقاط أوردة كف اليد</h3>
            <div className="text-sm text-slate-500">البيانات تنتقل بشكل مشفّر <span className="px-2 py-1 ml-2 rounded bg-blue-50 text-blue-700">مشفر</span></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded p-2">
              <video ref={videoRef} className="w-full h-64 bg-black rounded" playsInline muted />
              <div className="mt-2 flex gap-2">
                {!cameraActive ? (
                  <Button onClick={startCamera}>تشغيل الكاميرا</Button>
                ) : (
                  <Button variant="destructive" onClick={stopCamera}>إيقاف الكاميرا</Button>
                )}
                <Button onClick={captureImage} disabled={!cameraActive}>التقاط الصورة</Button>
              </div>
            </div>

            <div className="border rounded p-2">
              <div className="mb-2">معاينة الصورة الملتقطة</div>
              {capturedImage ? (
                <img src={capturedImage} alt="captured" className="w-full h-64 object-contain rounded" />
              ) : (
                <div className="w-full h-64 bg-slate-50 flex items-center justify-center rounded text-slate-400">لم يتم التقاط صورة بعد</div>
              )}

              <div className="mt-2 flex gap-2">
                <Button onClick={encryptCapturedImage} disabled={!capturedImage || encrypting}>
                  {encrypting ? 'جاري التشفير...' : 'تشفير (محلي)'}
                </Button>
                <Button onClick={uploadEncrypted} disabled={!encryptedPayload || uploadStatus === 'uploading'}>
                  {uploadStatus === 'uploading' ? 'جاري الإرسال...' : 'إرسال إلى الخادم'}
                </Button>
                <Button onClick={secureUploadEncrypted} disabled={!capturedImage || uploadStatus === 'uploading'} variant="secondary">
                  {uploadStatus === 'uploading' ? 'جاري الإرسال...' : 'إرسال آمن (ECDH)'}
                </Button>
              </div>

              <div className="mt-3">
                <div className="text-xs text-slate-500 mb-1">البيانات المشفّرة (تمثيل مختصر)</div>
                <div className="max-h-28 overflow-auto rounded border-l-4 border-blue-400 bg-blue-50 p-2 text-xs text-blue-900">{encryptedPayload ? encryptedPayload.slice(0, 512) + (encryptedPayload.length > 512 ? '…' : '') : 'لا توجد بيانات مشفّرة'}</div>
              </div>
            </div>
          </div>

          {/* hidden canvas used to capture image bytes */}

          <canvas ref={canvasRef} className="hidden" />


        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">
              <User className="inline ml-2 h-4 w-4" />
              الاسم الكامل
            </Label>
            <Input
              id="fullName"
              placeholder="أدخل اسمك الكامل"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              <Phone className="inline ml-2 h-4 w-4" />
              رقم الهاتف
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="05xxxxxxxx"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="atmCardLast4">
              <CreditCard className="inline ml-2 h-4 w-4" />
              آخر 4 أرقام من البطاقة البنكية
            </Label>
            <Input
              id="atmCardLast4"
              type="text"
              maxLength={4}
              placeholder="1234"
              value={formData.atmCardLast4}
              onChange={(e) => setFormData({ ...formData, atmCardLast4: e.target.value.replace(/\D/g, '') })}
              required
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankName">
              <Building2 className="inline ml-2 h-4 w-4" />
              اسم البنك
            </Label>
            <Input
              id="bankName"
              placeholder="البنك الأهلي"
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              "حفظ البيانات"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CompleteProfile;