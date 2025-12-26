"""
نظام المطابقة البيومترية لبصمة الكف
يستخدم PCA وSVM لمقارنة بصمات الكف وتحديد الهوية
"""
import numpy as np
from sklearn.decomposition import PCA
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Tuple, Optional, Dict
import pickle
import logging

class BiometricMatcher:
    def __init__(self, n_components: int = 100, svm_kernel: str = 'rbf'):
        self.logger = logging.getLogger(__name__)
        self.n_components = n_components
        self.svm_kernel = svm_kernel
        
        # نماذج التعلم
        self.pca_model = PCA(n_components=n_components)
        self.svm_model = SVC(kernel=svm_kernel, probability=True, C=1.0)
        self.scaler = StandardScaler()
        
        # بيانات التدريب
        self.is_trained = False
        self.feature_vectors = []
        self.labels = []
        self.user_ids = []
        
    def extract_palm_signature(self, feature_vector: np.ndarray) -> np.ndarray:
        """استخراج توقيع فريد من متجه الميزات"""
        # تطبيع المتجه
        normalized = feature_vector / (np.linalg.norm(feature_vector) + 1e-8)
        return normalized
    
    def train_pca_svm(self, feature_vectors: List[np.ndarray], labels: List[str], user_ids: List[str]) -> None:
        """تدريب نماذج PCA وSVM"""
        if len(feature_vectors) < 2:
            raise ValueError("يحتاج التدريب إلى 2 عينة على الأقل")
        
        # تحويل إلى مصفوفة NumPy
        X = np.array(feature_vectors)
        y = np.array(labels)
        
        # تطبيع الميزات
        X_scaled = self.scaler.fit_transform(X)
        
        # تطبيق PCA
        X_pca = self.pca_model.fit_transform(X_scaled)
        
        # تدريب SVM
        self.svm_model.fit(X_pca, y)
        
        # حفظ البيانات للبحث
        self.feature_vectors = X_scaled.tolist()
        self.labels = labels
        self.user_ids = user_ids
        self.is_trained = True
        
        self.logger.info(f"تم تدريب النموذج بنجاح مع {len(feature_vectors)} عينة")
    
    def match_palm_print(self, feature_vector: np.ndarray, threshold: float = 0.7) -> Dict:
        """مطابقة بصمة الكف مع قاعدة البيانات"""
        if not self.is_trained:
            raise ValueError("النموذج غير مدرّب. قم بتدريبه أولاً.")
        
        # تطبيع المتجه
        query_vector = feature_vector.reshape(1, -1)
        query_scaled = self.scaler.transform(query_vector)
        
        # تطبيق PCA على المتجه الجديد
        query_pca = self.pca_model.transform(query_scaled)
        
        # التنبؤ باستخدام SVM
        predicted_label = self.svm_model.predict(query_pca)[0]
        confidence = self.svm_model.predict_proba(query_pca).max()
        
        # حساب التشابه مع أقرب الجيران
        similarities = cosine_similarity(query_scaled, np.array(self.feature_vectors)).flatten()
        max_similarity = similarities.max()
        most_similar_idx = similarities.argmax()
        
        # التحقق من العتبة
        is_match = max_similarity >= threshold
        
        result = {
            'is_match': is_match,
            'confidence': float(confidence),
            'similarity_score': float(max_similarity),
            'predicted_label': predicted_label,
            'most_similar_user': self.user_ids[most_similar_idx] if is_match else None,
            'match_details': {
                'user_id': self.user_ids[most_similar_idx] if is_match else None,
                'label': self.labels[most_similar_idx] if is_match else None,
                'similarity': float(similarities[most_similar_idx]) if is_match else 0.0
            }
        }
        
        return result
    
    def add_palm_sample(self, feature_vector: np.ndarray, label: str, user_id: str) -> None:
        """إضافة عينة جديدة لقاعدة البيانات"""
        if not self.is_trained:
            # إذا لم يتم التدريب، نبدأ بقائمة جديدة
            self.feature_vectors = [feature_vector.tolist()]
            self.labels = [label]
            self.user_ids = [user_id]
            self.is_trained = True
        else:
            # إضافة إلى القائمة الحالية
            self.feature_vectors.append(feature_vector.tolist())
            self.labels.append(label)
            self.user_ids.append(user_id)
    
    def batch_match(self, feature_vectors: List[np.ndarray], threshold: float = 0.7) -> List[Dict]:
        """مطابقة دفعة من بصمات الكف"""
        results = []
        for vector in feature_vectors:
            result = self.match_palm_print(vector, threshold)
            results.append(result)
        return results
    
    def calculate_palm_similarity(self, vector1: np.ndarray, vector2: np.ndarray) -> float:
        """حساب التشابه بين متجهين لبصمات الكف"""
        # التشابه الكосيني
        similarity = cosine_similarity(vector1.reshape(1, -1), vector2.reshape(1, -1))[0][0]
        return float(similarity)
    
    def find_best_matches(self, query_vector: np.ndarray, top_k: int = 5) -> List[Dict]:
        """إيجاد أفضل المطابقات"""
        if not self.is_trained:
            raise ValueError("النموذج غير مدرّب. قم بتدريبه أولاً.")
        
        # تطبيع المتجه
        query_scaled = self.scaler.transform(query_vector.reshape(1, -1))
        
        # حساب التشابه مع جميع العينات
        similarities = cosine_similarity(query_scaled, np.array(self.feature_vectors)).flatten()
        
        # فرز النتائج
        sorted_indices = np.argsort(similarities)[::-1][:top_k]
        
        matches = []
        for idx in sorted_indices:
            match = {
                'user_id': self.user_ids[idx],
                'label': self.labels[idx],
                'similarity': float(similarities[idx]),
                'rank': len(matches) + 1
            }
            matches.append(match)
        
        return matches
    
    def get_pca_variance_ratio(self) -> np.ndarray:
        """الحصول على نسبة التباين المحفوظة من PCA"""
        if self.is_trained:
            return self.pca_model.explained_variance_ratio_
        return np.array([])
    
    def save_model(self, filepath: str) -> None:
        """حفظ النموذج"""
        model_data = {
            'pca_model': self.pca_model,
            'svm_model': self.svm_model,
            'scaler': self.scaler,
            'feature_vectors': self.feature_vectors,
            'labels': self.labels,
            'user_ids': self.user_ids,
            'is_trained': self.is_trained,
            'n_components': self.n_components,
            'svm_kernel': self.svm_kernel
        }
        
        with open(filepath, 'wb') as f:
            pickle.dump(model_data, f)
        
        self.logger.info(f"تم حفظ النموذج في {filepath}")
    
    def load_model(self, filepath: str) -> None:
        """تحميل النموذج"""
        with open(filepath, 'rb') as f:
            model_data = pickle.load(f)
        
        self.pca_model = model_data['pca_model']
        self.svm_model = model_data['svm_model']
        self.scaler = model_data['scaler']
        self.feature_vectors = model_data['feature_vectors']
        self.labels = model_data['labels']
        self.user_ids = model_data['user_ids']
        self.is_trained = model_data['is_trained']
        self.n_components = model_data['n_components']
        self.svm_kernel = model_data['svm_kernel']
        
        self.logger.info(f"تم تحميل النموذج من {filepath}")
    
    def get_model_info(self) -> Dict:
        """الحصول على معلومات النموذج"""
        info = {
            'is_trained': self.is_trained,
            'n_samples': len(self.feature_vectors) if self.is_trained else 0,
            'n_components': self.n_components,
            'svm_kernel': self.svm_kernel,
            'pca_variance_ratio_sum': float(self.pca_model.explained_variance_ratio_.sum()) if self.is_trained else 0.0
        }
        return info

class AdvancedBiometricMatcher(BiometricMatcher):
    """نظام مطابقة متقدم مع دعم للتحليل الإحصائي"""
    
    def __init__(self, n_components: int = 100, svm_kernel: str = 'rbf'):
        super().__init__(n_components, svm_kernel)
        self.match_history = []
        
    def advanced_match(self, feature_vector: np.ndarray, threshold: float = 0.7) -> Dict:
        """مطابقة متقدمة مع تحليل إضافي"""
        basic_result = self.match_palm_print(feature_vector, threshold)
        
        # تحليل إضافي
        if self.is_trained:
            query_scaled = self.scaler.transform(feature_vector.reshape(1, -1))
            query_pca = self.pca_model.transform(query_scaled)
            
            # حساب المسافة إلى مركز المجموعة
            distances = []
            for label in set(self.labels):
                label_indices = [i for i, l in enumerate(self.labels) if l == label]
                if label_indices:
                    label_vectors = np.array(self.feature_vectors)[label_indices]
                    label_mean = np.mean(label_vectors, axis=0)
                    distance = np.linalg.norm(query_scaled - label_mean)
                    distances.append((label, distance))
            
            distances.sort(key=lambda x: x[1])
            closest_groups = distances[:3]  # أفضل 3 مجموعات
            
            basic_result['closest_groups'] = [
                {'label': group[0], 'distance': float(group[1])} for group in closest_groups
            ]
        
        # إضافة إلى سجل المطابقات
        self.match_history.append({
            'timestamp': np.datetime64('now'),
            'query_vector': feature_vector.tolist(),
            'result': basic_result
        })
        
        return basic_result
    
    def get_matching_statistics(self) -> Dict:
        """الحصول على إحصائيات المطابقة"""
        if not self.match_history:
            return {'total_matches': 0}
        
        successful_matches = [h for h in self.match_history if h['result']['is_match']]
        
        stats = {
            'total_matches': len(self.match_history),
            'successful_matches': len(successful_matches),
            'success_rate': len(successful_matches) / len(self.match_history) if self.match_history else 0,
            'avg_confidence': np.mean([h['result']['confidence'] for h in self.match_history]) if self.match_history else 0,
            'avg_similarity': np.mean([h['result']['similarity_score'] for h in self.match_history]) if self.match_history else 0
        }
        
        return stats

# مثال على الاستخدام
if __name__ == "__main__":
    matcher = AdvancedBiometricMatcher(n_components=50)
    
    # مثال على بيانات تدريب وهمية
    # feature_vectors = [np.random.rand(128) for _ in range(10)]
    # labels = ['user1', 'user1', 'user2', 'user2', 'user3'] * 2
    # user_ids = ['id1', 'id1', 'id2', 'id2', 'id3'] * 2
    
    # matcher.train_pca_svm(feature_vectors, labels, user_ids)
    
    # مثال على مطابقة
    # query_vector = np.random.rand(128)
    # result = matcher.advanced_match(query_vector)
    # print(result)