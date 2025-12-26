"""
نظام تحليل بصمة الكف الذكي
يستخدم OpenCV وTensorFlow لتحليل بصمة الكف وتحسين دقة التعرف
"""
import cv2
import numpy as np
from tensorflow.keras.models import Sequential, Model
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Flatten, Dense, Dropout, Input
from sklearn.decomposition import PCA
from sklearn.svm import SVC
import base64
from typing import Dict, List, Tuple, Optional
import logging

class PalmAnalyzer:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.palm_cnn_model = self._build_cnn_model()
        self.pca_model = PCA(n_components=100)
        self.svm_model = SVC(kernel='rbf', probability=True)
        self.is_trained = False
        
    def _build_cnn_model(self) -> Model:
        """بناء نموذج CNN لتحليل بصمة الكف"""
        input_layer = Input(shape=(224, 224, 3))
        
        # طبقات التعلم العميق
        x = Conv2D(32, (3, 3), activation='relu', padding='same')(input_layer)
        x = MaxPooling2D((2, 2))(x)
        x = Conv2D(64, (3, 3), activation='relu', padding='same')(x)
        x = MaxPooling2D((2, 2))(x)
        x = Conv2D(128, (3, 3), activation='relu', padding='same')(x)
        x = MaxPooling2D((2, 2))(x)
        x = Conv2D(256, (3, 3), activation='relu', padding='same')(x)
        x = MaxPooling2D((2, 2))(x)
        
        x = Flatten()(x)
        x = Dense(512, activation='relu')(x)
        x = Dropout(0.5)(x)
        x = Dense(256, activation='relu')(x)
        x = Dropout(0.5)(x)
        output = Dense(128, activation='sigmoid', name='features')(x)  # متجه مميزات
        
        model = Model(inputs=input_layer, outputs=output)
        model.compile(optimizer='adam', loss='mse', metrics=['accuracy'])
        return model
    
    def preprocess_palm_image(self, image: np.ndarray) -> np.ndarray:
        """تحسين جودة صورة الكف وتحسين التباين"""
        # تحويل إلى لون رمادي
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
            
        # تحسين التباين باستخدام CLAHE
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray)
        
        # تصفية الضوضاء
        denoised = cv2.bilateralFilter(enhanced, 9, 75, 75)
        
        # تحسين الحواف
        edges = cv2.Canny(denoised, 50, 150)
        
        # دمج الصور لتحسين التفاصيل
        enhanced_with_edges = cv2.addWeighted(denoised, 0.8, edges, 0.2, 0)
        
        # تحجيم الصورة
        resized = cv2.resize(enhanced_with_edges, (224, 224))
        
        # تحويل إلى RGB وتوسيع الأبعاد
        rgb_image = cv2.cvtColor(resized, cv2.COLOR_GRAY2RGB)
        processed = np.expand_dims(rgb_image, axis=0) / 255.0
        
        return processed
    
    def extract_palm_features(self, image: np.ndarray) -> np.ndarray:
        """استخراج الخصائص البيومترية من صورة الكف"""
        processed_image = self.preprocess_palm_image(image)
        features = self.palm_cnn_model.predict(processed_image, verbose=0)
        return features[0]
    
    def detect_palm_lines(self, image: np.ndarray) -> Dict[str, List]:
        """كشف الخطوط الرئيسية والدقيقة في بصمة الكف"""
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
            
        # تحسين التباين
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray)
        
        # كشف الحواف
        edges = cv2.Canny(enhanced, 50, 150)
        
        # كشف الخطوط باستخدام Hough Transform
        lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=50, minLineLength=30, maxLineGap=10)
        
        # تحليل الخطوط
        palm_lines = {
            'main_lines': [],
            'fine_lines': [],
            'line_count': 0
        }
        
        if lines is not None:
            for line in lines:
                x1, y1, x2, y2 = line[0]
                length = np.sqrt((x2-x1)**2 + (y2-y1)**2)
                if length > 50:  # خطوط رئيسية
                    palm_lines['main_lines'].append((x1, y1, x2, y2, length))
                else:  # خطوط دقيقة
                    palm_lines['fine_lines'].append((x1, y1, x2, y2, length))
                    
        palm_lines['line_count'] = len(palm_lines['main_lines']) + len(palm_lines['fine_lines'])
        
        return palm_lines
    
    def analyze_palm_texture(self, image: np.ndarray) -> Dict[str, float]:
        """تحليل ملمس بصمة الكف"""
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
            
        # حساب ميزات الملمس باستخدام GLCM
        from skimage.feature import graycomatrix, graycoprops
        
        # تحجيم الصورة للتحليل
        resized = cv2.resize(gray, (128, 128))
        
        # حساب مصفوفة الت.Gray
        glcm = graycomatrix(resized, [1], [0, 45, 90, 135], levels=256, symmetric=True, normed=True)
        
        texture_features = {
            'contrast': graycoprops(glcm, 'contrast').mean(),
            'energy': graycoprops(glcm, 'energy').mean(),
            'homogeneity': graycoprops(glcm, 'homogeneity').mean(),
            'correlation': graycoprops(glcm, 'correlation').mean()
        }
        
        return texture_features
    
    def detect_liveness(self, image: np.ndarray, thermal_data: Optional[np.ndarray] = None) -> Dict[str, bool]:
        """التحقق من الحياة (Anti-spoofing)"""
        results = {
            'blood_flow_detected': False,
            'temperature_valid': False,
            'liveness_score': 0.0,
            'is_real': False
        }
        
        # التحقق من تدفق الدم (تحليل الألوان والتشبع)
        if len(image.shape) == 3:
            hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
            saturation = hsv[:,:,1]
            mean_saturation = np.mean(saturation)
            
            # تحليل الألوان (الدم يعطي تشبعاً عالياً)
            results['blood_flow_detected'] = mean_saturation > 50
        
        # التحقق من درجة الحرارة (إذا كانت متوفرة)
        if thermal_data is not None:
            mean_temp = np.mean(thermal_data)
            results['temperature_valid'] = 35 <= mean_temp <= 40  # درجة حرارة الجسم الطبيعية
        
        # حساب درجة الحياة
        liveness_score = 0.0
        if results['blood_flow_detected']:
            liveness_score += 0.4
        if results.get('temperature_valid', False):
            liveness_score += 0.3
            
        # التحقق من الجودة البصرية
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        if laplacian_var > 100:  # صورة حادة
            liveness_score += 0.3
            
        results['liveness_score'] = min(liveness_score, 1.0)
        results['is_real'] = liveness_score > 0.6
        
        return results
    
    def analyze_palm(self, image: np.ndarray, thermal_data: Optional[np.ndarray] = None) -> Dict:
        """تحليل بصمة الكف الشامل"""
        # استخراج الميزات
        features = self.extract_palm_features(image)
        
        # كشف الخطوط
        lines = self.detect_palm_lines(image)
        
        # تحليل الملمس
        texture = self.analyze_palm_texture(image)
        
        # التحقق من الحياة
        liveness = self.detect_liveness(image, thermal_data)
        
        # توليد البصمة الفريدة
        palm_hash = self._generate_palm_hash(features)
        
        result = {
            'palm_hash': palm_hash,
            'features': features.tolist(),
            'lines': lines,
            'texture': texture,
            'liveness': liveness,
            'quality_score': self._calculate_quality_score(image),
            'confidence': liveness['liveness_score'] * 0.8 + 0.2  # الثقة المحسوبة
        }
        
        return result
    
    def _generate_palm_hash(self, features: np.ndarray) -> str:
        """توليد تجزئة فريدة لبصمة الكف"""
        import hashlib
        feature_str = ''.join([str(x) for x in features[:10]])  # استخدام أول 10 ميزات
        return hashlib.sha256(feature_str.encode()).hexdigest()[:32]
    
    def _calculate_quality_score(self, image: np.ndarray) -> float:
        """حساب جودة الصورة"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
        
        # تباين الصورة
        contrast = np.std(gray)
        
        # وضوح الحواف
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # تقييم الجودة (0-1)
        quality = min((contrast / 50 + laplacian_var / 1000) / 2, 1.0)
        return quality

# مثال على الاستخدام
if __name__ == "__main__":
    analyzer = PalmAnalyzer()
    
    # لاختبار النظام، تحتاج إلى صورة كف حقيقية
    # image = cv2.imread('palm_image.jpg')
    # result = analyzer.analyze_palm(image)
    # print(result)