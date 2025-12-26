"""
نظام معالجة صور بصمة الكف
يحتوي على خوارزميات متقدمة لتحسين جودة الصور وتحسين التفاصيل
"""
import cv2
import numpy as np
from scipy import ndimage
from skimage import filters, morphology, feature
from typing import Tuple, List, Optional
import logging

class PalmImageProcessor:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
    def enhance_palm_image(self, image: np.ndarray) -> np.ndarray:
        """تحسين جودة صورة بصمة الكف"""
        # التأكد من أن الصورة ملونة
        if len(image.shape) == 2:
            gray = image
        else:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # تحسين التباين باستخدام CLAHE
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray)
        
        # تصفية الضوضاء باستخدام bilateral filter
        denoised = cv2.bilateralFilter(enhanced, 15, 75, 75)
        
        # تعزيز الحواف
        edges = cv2.Canny(denoised, 30, 100)
        
        # دمج الصور الأصلية مع الحواف المحسنة
        enhanced_with_edges = cv2.addWeighted(denoised, 0.8, edges, 0.2, 0)
        
        return enhanced_with_edges
    
    def detect_palm_region(self, image: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """كشف منطقة الكف في الصورة"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        
        # تحسين التباين
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray)
        
        # كشف الحواف
        edges = cv2.Canny(enhanced, 50, 150)
        
        # إغلاق الفتحات الصغيرة
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
        closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel)
        
        # ملء الثقوب
        filled = ndimage.binary_fill_holes(closed).astype(int)
        
        # إيجاد الحدود
        contours, _ = cv2.findContours(filled.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # اختيار الحد الأكبر (منطقة الكف)
        if contours:
            palm_contour = max(contours, key=cv2.contourArea)
            mask = np.zeros_like(gray)
            cv2.fillPoly(mask, [palm_contour], 255)
            
            # تطبيق القناع على الصورة الأصلية
            masked_image = cv2.bitwise_and(gray, mask)
            return masked_image, mask
        
        return gray, np.ones_like(gray) * 255
    
    def enhance_palm_lines(self, image: np.ndarray) -> np.ndarray:
        """تحسين وضوح خطوط الكف"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        
        # تحسين التباين
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray)
        
        # تصفية الضوضاء
        denoised = cv2.bilateralFilter(enhanced, 9, 75, 75)
        
        # تعزيز الحواف باستخدام فلتر Sobel
        sobelx = cv2.Sobel(denoised, cv2.CV_64F, 1, 0, ksize=3)
        sobely = cv2.Sobel(denoised, cv2.CV_64F, 0, 1, ksize=3)
        sobel = np.sqrt(sobelx**2 + sobely**2)
        
        # تطبيع النتائج
        sobel_normalized = cv2.normalize(sobel, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)
        
        # دمج الصورة الأصلية مع الحواف المحسنة
        enhanced_lines = cv2.addWeighted(denoised, 0.7, sobel_normalized, 0.3, 0)
        
        return enhanced_lines
    
    def extract_palm_features_advanced(self, image: np.ndarray) -> dict:
        """استخراج ميزات متقدمة من بصمة الكف"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        
        # تحسين الصورة
        enhanced = self.enhance_palm_image(gray)
        
        # كشف الميزات باستخدام ORB
        orb = cv2.ORB_create(nfeatures=1000)
        keypoints, descriptors = orb.detectAndCompute(enhanced, None)
        
        # كشف الميزات باستخدام SIFT (إذا متوفر)
        try:
            sift = cv2.SIFT_create()
            sift_keypoints, sift_descriptors = sift.detectAndCompute(enhanced, None)
        except:
            sift_keypoints, sift_descriptors = keypoints, descriptors
        
        # كشف الحواف باستخدام Canny
        edges = cv2.Canny(enhanced, 50, 150)
        
        # كشف الخطوط باستخدام Hough Transform
        lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=50, minLineLength=30, maxLineGap=10)
        
        # تحليل النسيج باستخدام Local Binary Pattern
        lbp_features = self._calculate_lbp_features(enhanced)
        
        # حساب ميزات التباين
        contrast = np.std(enhanced)
        
        # حساب ميزات التركيب
        composition_features = self._analyze_composition(enhanced)
        
        return {
            'keypoints': len(keypoints) if keypoints is not None else 0,
            'sift_keypoints': len(sift_keypoints) if sift_keypoints is not None else 0,
            'edge_density': np.sum(edges > 0) / edges.size,
            'contrast': contrast,
            'lbp_features': lbp_features,
            'composition': composition_features,
            'line_count': len(lines) if lines is not None else 0
        }
    
    def _calculate_lbp_features(self, image: np.ndarray) -> List[float]:
        """حساب ميزات Local Binary Pattern"""
        from skimage.feature import local_binary_pattern
        
        # تطبيق LBP
        radius = 3
        n_points = 8 * radius
        lbp = local_binary_pattern(image, n_points, radius, method='uniform')
        
        # حساب.histogram
        hist, _ = np.histogram(lbp.ravel(), bins=n_points + 2, range=(0, n_points + 2), density=True)
        
        return hist.tolist()
    
    def _analyze_composition(self, image: np.ndarray) -> dict:
        """تحليل تركيب الصورة"""
        # تقسيم الصورة إلى 9 أقسام (3x3) لتحليل التركيب
        h, w = image.shape
        h_step, w_step = h // 3, w // 3
        
        composition = {}
        for i in range(3):
            for j in range(3):
                region = image[i*h_step:(i+1)*h_step, j*w_step:(j+1)*w_step]
                composition[f'region_{i}_{j}_mean'] = float(np.mean(region))
                composition[f'region_{i}_{j}_std'] = float(np.std(region))
        
        return composition
    
    def remove_background(self, image: np.ndarray) -> np.ndarray:
        """إزالة الخلفية وتحسين تركيز الصورة على الكف"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        
        # إنشاء قناع للخلفية
        mask = np.zeros((gray.shape[0] + 2, gray.shape[1] + 2), np.uint8)
        
        # تحسين التباين
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray)
        
        # تحديد مناطق محددة للبدء
        seed_points = [(10, 10), (10, gray.shape[1]-10), (gray.shape[0]-10, 10), (gray.shape[0]-10, gray.shape[1]-10)]
        
        # ملء المناطق غير المرغوب فيها
        for seed in seed_points:
            cv2.floodFill(enhanced, mask, seed, 0, loDiff=50, upDiff=50)
        
        # تطبيق القناع
        result = cv2.bitwise_and(gray, enhanced)
        
        return result
    
    def normalize_palm_image(self, image: np.ndarray) -> np.ndarray:
        """Normalize palm image for consistent analysis"""
        # التأكد من أن الصورة ملونة
        if len(image.shape) == 2:
            gray = image
        else:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # تحجيم الصورة إلى حجم قياسي
        resized = cv2.resize(gray, (224, 224))
        
        # تطبيع القيم
        normalized = resized.astype(np.float32) / 255.0
        
        return normalized
    
    def preprocess_for_cnn(self, image: np.ndarray) -> np.ndarray:
        """تجهيز الصورة للتحليل باستخدام الشبكة العصبية"""
        # التحسين والتجهيز
        enhanced = self.enhance_palm_image(image)
        
        # التحجيم
        resized = cv2.resize(enhanced, (224, 224))
        
        # التطبيع
        normalized = resized.astype(np.float32) / 255.0
        
        # توسيع الأبعاد
        if len(normalized.shape) == 2:
            normalized = np.expand_dims(normalized, axis=-1)  # إضافة بعد القناة
        normalized = np.expand_dims(normalized, axis=0)  # إضافة بعد الدفعة
        
        # تكرار القناة لجعلها RGB
        normalized = np.repeat(normalized, 3, axis=-1)
        
        return normalized

# مثال على الاستخدام
if __name__ == "__main__":
    processor = PalmImageProcessor()
    
    # لاختبار النظام، تحتاج إلى صورة كف حقيقية
    # image = cv2.imread('palm_image.jpg')
    # enhanced = processor.enhance_palm_image(image)
    # features = processor.extract_palm_features_advanced(image)
    # print(f"Features: {features}")