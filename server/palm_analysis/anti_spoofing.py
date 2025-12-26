"""
نظام مكافحة التزوير لبصمة الكف
يستخدم تقنيات متقدمة لكشف التلاعب والمستخدمين غير الشرعيين
"""
import cv2
import numpy as np
from scipy import signal
from typing import Dict, Tuple, Optional, List
import logging
from skimage.feature import local_binary_pattern
from sklearn.ensemble import IsolationForest
import tensorflow as tf

class AntiSpoofingSystem:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # نموذج التعلم الآلي لاكتشاف التلاعب
        self.anomaly_detector = IsolationForest(contamination=0.1, random_state=42)
        self.is_trained = False
        
        # نموذج CNN لاكتشاف التلاعب (إذا متوفر)
        self.cnn_detector = self._build_cnn_detector()
        
    def _build_cnn_detector(self) -> Optional[tf.keras.Model]:
        """بناء نموذج CNN للكشف عن التلاعب"""
        try:
            model = tf.keras.Sequential([
                tf.keras.layers.Conv2D(32, (3, 3), activation='relu', input_shape=(224, 224, 3)),
                tf.keras.layers.MaxPooling2D((2, 2)),
                tf.keras.layers.Conv2D(64, (3, 3), activation='relu'),
                tf.keras.layers.MaxPooling2D((2, 2)),
                tf.keras.layers.Conv2D(64, (3, 3), activation='relu'),
                tf.keras.layers.GlobalAveragePooling2D(),
                tf.keras.layers.Dense(64, activation='relu'),
                tf.keras.layers.Dense(1, activation='sigmoid')
            ])
            
            model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
            return model
        except:
            return None
    
    def detect_skin_temperature(self, thermal_image: np.ndarray) -> Dict[str, float]:
        """الكشف عن درجة حرارة الجلد"""
        # تحليل الصورة الحرارية
        mean_temp = np.mean(thermal_image)
        std_temp = np.std(thermal_image)
        
        # التحقق من درجة حرارة الجسم الطبيعية (35-37 مئوية)
        temp_valid = 35 <= mean_temp <= 37
        temp_variance = std_temp > 0.5  # تباين طبيعي في درجة الحرارة
        
        return {
            'mean_temperature': float(mean_temp),
            'temperature_valid': temp_valid,
            'temperature_variance': float(std_temp),
            'temperature_score': 1.0 if temp_valid and temp_variance else 0.0
        }
    
    def detect_blood_flow(self, rgb_image: np.ndarray) -> Dict[str, float]:
        """الكشف عن تدفق الدم (PPG - Photoplethysmography من الصورة)"""
        # تحويل إلى مساحة الألوان RGB
        if len(rgb_image.shape) == 2:
            rgb_image = cv2.cvtColor(rgb_image, cv2.COLOR_GRAY2RGB)
        
        # استخراج القنوات
        b, g, r = cv2.split(rgb_image.astype(np.float32))
        
        # حساب مؤشر التروية (Perfusion Index)
        # متوسط التباين في القنوات
        r_variance = np.var(r)
        g_variance = np.var(g)
        b_variance = np.var(b)
        
        # مؤشر التروية - يعتمد على التغيرات في الألوان
        perfusion_index = (r_variance + g_variance + b_variance) / 3.0
        
        # تحليل تباين الألوان - البشرة الحية لها تباين معين
        color_variance = np.mean([
            np.std(r.flatten()),
            np.std(g.flatten()), 
            np.std(b.flatten())
        ])
        
        # تحليل تباين القناة الحمراء - الأكثر حساسية للدم
        red_channel_analysis = np.std(r.flatten()) > 10  # مؤشر وجود تدفق دم
        
        return {
            'perfusion_index': float(perfusion_index),
            'color_variance': float(color_variance),
            'red_channel_valid': red_channel_analysis,
            'blood_flow_score': 1.0 if red_channel_analysis and color_variance > 15 else 0.0
        }
    
    def detect_texture_anomalies(self, image: np.ndarray) -> Dict[str, float]:
        """الكشف عن شذوذ في نسيج الجلد"""
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # حساب Local Binary Pattern
        lbp = local_binary_pattern(gray, P=8, R=1, method='uniform')
        
        # حساب.histogram
        hist, _ = np.histogram(lbp.ravel(), bins=10, range=(0, 10), density=True)
        
        # تحليل النسيج - البشرة الطبيعية لها توزيع معين
        texture_uniformity = np.std(hist)
        
        # كشف الحواف - البشرة الحية لها حافة طبيعية
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / edges.size
        
        # تحليل التباين - البشرة الطبيعية لها تباين معين
        contrast = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # تحليل النسيج - البشرة الحقيقية لها نمط معين
        texture_score = 0.3 if 0.1 <= texture_uniformity <= 0.4 else 0.0
        edge_score = 0.3 if 0.01 <= edge_density <= 0.1 else 0.0
        contrast_score = 0.4 if 100 <= contrast <= 1000 else 0.0
        
        total_score = texture_score + edge_score + contrast_score
        
        return {
            'texture_uniformity': float(texture_uniformity),
            'edge_density': float(edge_density),
            'contrast': float(contrast),
            'texture_score': texture_score,
            'edge_score': edge_score,
            'contrast_score': contrast_score,
            'anomaly_score': total_score
        }
    
    def detect_printing_artifacts(self, image: np.ndarray) -> Dict[str, float]:
        """الكشف عن آثار الطباعة أو التلاعب"""
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # تحليل التردد - الصور المطبوعة تحتوي على نمط معين
        # تحويل فورييه
        f_transform = np.fft.fft2(gray)
        f_shift = np.fft.fftshift(f_transform)
        magnitude_spectrum = np.log(np.abs(f_shift) + 1)
        
        # تحليل النمط - الصور المطبوعة تحتوي على نمط مصفوفة (Moire)
        # حساب التركيز على الترددات العالية
        h, w = magnitude_spectrum.shape
        center_h, center_w = h // 2, w // 2
        low_freq = magnitude_spectrum[center_h-10:center_h+10, center_w-10:center_w+10]
        high_freq = magnitude_spectrum
        
        # تحليل التركيز
        high_freq_energy = np.mean(high_freq)
        low_freq_energy = np.mean(low_freq)
        
        # تحليل النمط المصفوفة
        moire_pattern = high_freq_energy / (low_freq_energy + 1e-8)
        
        # تحليل الحواف - الصور الأصلية لها حافة طبيعية
        edges = cv2.Canny(gray, 50, 150)
        edge_contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # تحليل حجم الحواف - الصور المطبوعة تحتوي على حواف غير طبيعية
        total_edge_length = sum([len(contour) for contour in edge_contours])
        edge_ratio = total_edge_length / (gray.shape[0] * gray.shape[1])
        
        # حساب النتيجة
        moire_score = 0.0 if moire_pattern > 2.0 else 1.0  # نمط Moire يشير إلى تلاعب
        edge_score = 0.0 if edge_ratio > 0.3 else 1.0  # نسبة حواف عالية تشير إلى تلاعب
        
        total_score = (moire_score + edge_score) / 2.0
        
        return {
            'moire_pattern': float(moire_pattern),
            'edge_ratio': float(edge_ratio),
            'high_freq_energy': float(high_freq_energy),
            'low_freq_energy': float(low_freq_energy),
            'moire_score': moire_score,
            'edge_score': edge_score,
            'printing_artifact_score': total_score
        }
    
    def detect_2d_attack(self, image: np.ndarray) -> Dict[str, float]:
        """الكشف عن محاولات الهجوم ثنائية الأبعاد (صورة مطبوعة)"""
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # تحليل التباين - الصور الحية لها تباين أفضل
        variance = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # تحليل التفاصيل - الصور الحية تحتوي على تفاصيل دقيقة
        # كشف الحواف
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / edges.size
        
        # تحليل التركيب - الصور الحية تحتوي على عمق
        # استخدام تحليل التركيب للكشف عن الصور المسطحة
        sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        sobel = np.sqrt(sobelx**2 + sobely**2)
        
        sobel_mean = np.mean(sobel)
        
        # حساب النتيجة - الصور الحية تحتوي على تباين وتفاصيل عالية
        variance_score = min(variance / 500.0, 1.0)  # تباين عالي = حقيقي
        edge_score = min(edge_density * 10, 1.0)     # كثافة حواف مناسبة = حقيقي
        sobel_score = min(sobel_mean / 50.0, 1.0)    # تفاصيل حادة = حقيقي
        
        total_score = (variance_score * 0.4 + edge_score * 0.3 + sobel_score * 0.3)
        
        return {
            'laplacian_variance': float(variance),
            'edge_density': float(edge_density),
            'sobel_mean': float(sobel_mean),
            'variance_score': variance_score,
            'edge_score': edge_score,
            'sobel_score': sobel_score,
            '2d_attack_score': total_score
        }
    
    def detect_depth_anomalies(self, depth_map: Optional[np.ndarray] = None) -> Dict[str, float]:
        """الكشف عن شذوذ في خريطة العمق"""
        if depth_map is None:
            return {
                'depth_available': False,
                'depth_score': 0.0,
                'depth_variance': 0.0
            }
        
        # تحليل تباين العمق - البشرة الحية لها عمق طبيعي
        depth_variance = np.var(depth_map)
        depth_mean = np.mean(depth_map)
        
        # تحليل التدرجات - البشرة الحية لها تدرجات طبيعية
        depth_gradient = np.gradient(depth_map)
        gradient_mean = np.mean([np.mean(grad) for grad in depth_gradient])
        
        # حساب النتيجة
        depth_score = 0.0 if depth_variance < 10 else 1.0  # تباين منخفض يشير إلى تلاعب
        
        return {
            'depth_available': True,
            'depth_mean': float(depth_mean),
            'depth_variance': float(depth_variance),
            'gradient_mean': float(gradient_mean),
            'depth_score': depth_score
        }
    
    def comprehensive_spoofing_detection(self, 
                                       rgb_image: np.ndarray,
                                       thermal_image: Optional[np.ndarray] = None,
                                       depth_map: Optional[np.ndarray] = None) -> Dict:
        """الكشف الشامل عن التلاعب"""
        # تحليل درجة الحرارة (إذا متوفر)
        temp_result = self.detect_skin_temperature(thermal_image) if thermal_image is not None else {
            'mean_temperature': 0.0,
            'temperature_valid': False,
            'temperature_variance': 0.0,
            'temperature_score': 0.0
        }
        
        # تحليل تدفق الدم
        blood_result = self.detect_blood_flow(rgb_image)
        
        # تحليل النسيج
        texture_result = self.detect_texture_anomalies(rgb_image)
        
        # تحليل آثار الطباعة
        print_result = self.detect_printing_artifacts(rgb_image)
        
        # تحليل محاولات 2D
        attack_result = self.detect_2d_attack(rgb_image)
        
        # تحليل العمق (إذا متوفر)
        depth_result = self.detect_depth_anomalies(depth_map)
        
        # حساب النتيجة الكلية
        total_score = (
            temp_result['temperature_score'] * 0.2 +
            blood_result['blood_flow_score'] * 0.2 +
            texture_result['anomaly_score'] * 0.15 +
            print_result['printing_artifact_score'] * 0.15 +
            attack_result['2d_attack_score'] * 0.2 +
            depth_result['depth_score'] * 0.1
        )
        
        is_real = total_score > 0.6
        
        return {
            'is_real': is_real,
            'total_score': total_score,
            'confidence': total_score,
            'temperature_analysis': temp_result,
            'blood_flow_analysis': blood_result,
            'texture_analysis': texture_result,
            'printing_analysis': print_result,
            'attack_analysis': attack_result,
            'depth_analysis': depth_result,
            'detailed_report': {
                'temperature_valid': temp_result['temperature_valid'],
                'blood_flow_detected': blood_result['red_channel_valid'],
                'texture_normal': texture_result['anomaly_score'] > 0.5,
                'no_printing_artifacts': print_result['printing_artifact_score'] > 0.5,
                'not_2d_attack': attack_result['2d_attack_score'] > 0.5,
                'depth_valid': depth_result['depth_available'] and depth_result['depth_score'] > 0.5
            }
        }
    
    def train_anomaly_detector(self, genuine_samples: List[np.ndarray], fake_samples: List[np.ndarray]):
        """تدريب مكتشف الشذوذ"""
        # استخراج ميزات من العينات
        genuine_features = []
        fake_features = []
        
        for sample in genuine_samples:
            features = self._extract_spoofing_features(sample)
            genuine_features.append(features)
        
        for sample in fake_samples:
            features = self._extract_spoofing_features(sample)
            fake_features.append(features)
        
        # دمج البيانات
        all_features = genuine_features + fake_features
        X = np.array(all_features)
        
        # تدريب مكتشف الشذوذ
        self.anomaly_detector.fit(X)
        self.is_trained = True
        
        self.logger.info(f"تم تدريب مكتشف الشذوذ مع {len(genuine_samples)} عينات حقيقية و{len(fake_samples)} عينات مزيفة")
    
    def _extract_spoofing_features(self, image: np.ndarray) -> List[float]:
        """استخراج ميزات للكشف عن التلاعب"""
        features = []
        
        # ميزات التباين
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        variance = cv2.Laplacian(gray, cv2.CV_64F).var()
        features.append(variance)
        
        # ميزات الحواف
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges > 0) / edges.size
        features.append(edge_density)
        
        # ميزات التردد
        f_transform = np.fft.fft2(gray)
        magnitude_spectrum = np.log(np.abs(f_transform) + 1)
        freq_energy = np.mean(magnitude_spectrum)
        features.append(freq_energy)
        
        # ميزات النسيج
        lbp = local_binary_pattern(gray, P=8, R=1, method='uniform')
        hist, _ = np.histogram(lbp.ravel(), bins=10, range=(0, 10), density=True)
        texture_features = list(hist)
        features.extend(texture_features)
        
        return features

class AdvancedAntiSpoofingSystem(AntiSpoofingSystem):
    """نظام مكافحة تزوير متقدم مع دعم للتعلم العميق"""
    
    def __init__(self):
        super().__init__()
        self.temporal_analyzer = TemporalPatternAnalyzer()
        
    def analyze_temporal_consistency(self, image_sequence: List[np.ndarray]) -> Dict[str, float]:
        """تحليل التماسك الزمني للصور المتتالية"""
        return self.temporal_analyzer.analyze_sequence(image_sequence)
    
    def multi_modal_spoofing_detection(self, 
                                     rgb_image: np.ndarray,
                                     thermal_image: Optional[np.ndarray] = None,
                                     depth_map: Optional[np.ndarray] = None,
                                     image_sequence: Optional[List[np.ndarray]] = None) -> Dict:
        """الكشف عن التلاعب باستخدام بيانات متعددة الوسائط"""
        # التحليل الأساسي
        basic_result = self.comprehensive_spoofing_detection(rgb_image, thermal_image, depth_map)
        
        # التحليل الزمني (إذا متوفر تسلسل صور)
        temporal_result = self.analyze_temporal_consistency(image_sequence) if image_sequence else {
            'temporal_consistency': 1.0,
            'motion_validity': 1.0,
            'temporal_score': 1.0
        }
        
        # دمج النتائج
        combined_score = (
            basic_result['total_score'] * 0.7 +
            temporal_result['temporal_score'] * 0.3
        )
        
        final_result = {
            **basic_result,
            'temporal_analysis': temporal_result,
            'combined_score': combined_score,
            'is_real': combined_score > 0.6,
            'final_confidence': combined_score
        }
        
        return final_result

class TemporalPatternAnalyzer:
    """محلل النمط الزمني لاكتشاف التلاعب"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
    
    def analyze_sequence(self, image_sequence: List[np.ndarray]) -> Dict[str, float]:
        """تحليل تسلسل الصور لاكتشاف التلاعب"""
        if len(image_sequence) < 2:
            return {
                'temporal_consistency': 1.0,
                'motion_validity': 1.0,
                'temporal_score': 1.0
            }
        
        # تحليل الحركة بين الصور
        motion_scores = []
        consistency_scores = []
        
        for i in range(1, len(image_sequence)):
            prev_img = image_sequence[i-1]
            curr_img = image_sequence[i]
            
            # تحويل إلى رمادي
            if len(prev_img.shape) == 3:
                prev_gray = cv2.cvtColor(prev_img, cv2.COLOR_BGR2GRAY)
                curr_gray = cv2.cvtColor(curr_img, cv2.COLOR_BGR2GRAY)
            else:
                prev_gray = prev_img
                curr_gray = curr_img
            
            # حساب تغير الحركة
            diff = cv2.absdiff(prev_gray, curr_gray)
            motion_score = np.mean(diff)
            motion_scores.append(motion_score)
            
            # تحليل التماسك
            correlation = np.corrcoef(prev_gray.flatten(), curr_gray.flatten())[0, 1]
            consistency_score = abs(correlation)
            consistency_scores.append(consistency_score)
        
        avg_motion = np.mean(motion_scores) if motion_scores else 0
        avg_consistency = np.mean(consistency_scores) if consistency_scores else 1
        
        # تحليل الحركة - الحركة الطبيعية يجب أن تكون ضمن نطاق معين
        motion_validity = 0.3 if 5 < avg_motion < 50 else 0.0
        consistency_score = avg_consistency if avg_consistency > 0.7 else 0.0
        
        temporal_score = (motion_validity + consistency_score) / 2.0
        
        return {
            'temporal_consistency': float(avg_consistency),
            'motion_validity': float(motion_validity),
            'avg_motion': float(avg_motion),
            'temporal_score': float(temporal_score),
            'sequence_length': len(image_sequence)
        }

# مثال على الاستخدام
if __name__ == "__main__":
    spoofing_system = AdvancedAntiSpoofingSystem()
    
    # مثال على تحليل صورة
    # image = cv2.imread('palm_image.jpg')
    # thermal_data = np.random.rand(224, 224) * 2 + 35  # بيانات حرارية وهمية
    # result = spoofing_system.comprehensive_spoofing_detection(image, thermal_data)
    # print(f"نتيجة التحقق من التلاعب: {result}")