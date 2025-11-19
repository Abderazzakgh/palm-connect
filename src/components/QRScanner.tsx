import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Camera, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose?: () => void;
}

const QRScanner = ({ onScanSuccess, onClose }: QRScannerProps) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraId, setCameraId] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  const handleScanSuccess = (decodedText: string) => {
    console.log("✅ تم مسح الباركود بنجاح:", decodedText);
    stopScanning();
    onScanSuccess(decodedText);
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        const scanner = scannerRef.current;
        // Check if scanner is running before stopping
        try {
          await scanner.stop();
        } catch (stopErr: unknown) {
          const msg = stopErr instanceof Error ? stopErr.message : String(stopErr);
          if (!msg.includes("already stopped")) {
            console.error("Error stopping scanner:", stopErr);
          }
        }
        await scanner.clear();
      } catch (err) {
        console.error("Error clearing scanner:", err);
      }
      scannerRef.current = null;
    }
    setScanning(false);
    setCameraId(null);
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      stopScanning();
    };
     
  }, []);

  const startScanning = async () => {
    try {
      setError(null);
      setScanning(true);

      // Get available cameras
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        // Prefer back camera if available
        const backCamera = devices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear')
        );
        const selectedCameraId = backCamera?.id || devices[0].id;
        setCameraId(selectedCameraId);

        const scanner = new Html5Qrcode("qr-reader", {
          verbose: false,
        });

        scannerRef.current = scanner;

        await scanner.start(
          selectedCameraId,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            disableFlip: false,
          },
          (decodedText) => {
            // Success callback
            handleScanSuccess(decodedText);
          },
          (errorMessage) => {
            // Error callback - ignore most errors as they're just "no QR code found"
            // Only show actual errors
            if (errorMessage && 
                !errorMessage.includes("NotFoundException") &&
                !errorMessage.includes("No QR code found")) {
              console.log("QR scan error:", errorMessage);
            }
          }
        );
      } else {
        throw new Error("لم يتم العثور على كاميرا. يرجى التأكد من إعطاء صلاحيات الكاميرا");
      }
    } catch (err: unknown) {
      console.error("Error starting scanner:", err);
      let errorMessage = "فشل تشغيل الماسح";
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Permission denied") || msg.includes("NotAllowedError")) {
        errorMessage = "تم رفض صلاحيات الكاميرا. يرجى السماح بالوصول إلى الكاميرا";
      } else if (msg.includes("NotFoundError") || msg.includes("no camera")) {
        errorMessage = "لم يتم العثور على كاميرا";
      } else if (msg) {
        errorMessage = msg;
      }
      setError(errorMessage);
      setScanning(false);
    }
  };

  const handleClose = () => {
    stopScanning();
    if (onClose) {
      onClose();
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">ماسح الباركود</h3>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div
          id="qr-reader"
          ref={scannerContainerRef}
          className="w-full rounded-lg overflow-hidden bg-black min-h-[300px] flex items-center justify-center"
        />

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="flex gap-2">
          {!scanning ? (
            <Button
              onClick={startScanning}
              className="flex-1"
              disabled={scanning}
            >
              <Camera className="ml-2 h-4 w-4" />
              بدء المسح
            </Button>
          ) : (
            <Button
              onClick={stopScanning}
              variant="destructive"
              className="flex-1"
            >
              <X className="ml-2 h-4 w-4" />
              إيقاف المسح
            </Button>
          )}
        </div>

        {!error && (
          <div className="text-xs text-muted-foreground text-center">
            💡 ضع الباركود داخل الإطار لمسحه تلقائياً
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QRScanner;

