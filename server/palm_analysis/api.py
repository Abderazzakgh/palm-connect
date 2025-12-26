"""
API لتحليل بصمة الكف باستخدام الذكاء الاصطناعي
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import cv2
import requests
from io import BytesIO
from palm_analyzer import PalmAnalyzer
from image_processor import PalmImageProcessor
from biometric_matcher import AdvancedBiometricMatcher
from anti_spoofing import AdvancedAntiSpoofingSystem
import base64
import logging
from typing import Dict, Any

app = Flask(__name__)
CORS(app)

# تهيئة أنظمة التحليل
palm_analyzer = PalmAnalyzer()
image_processor = PalmImageProcessor()
biometric_matcher = AdvancedBiometricMatcher()
anti_spoofing_system = AdvancedAntiSpoofingSystem()

# تمكين التسجيل
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def download_image_from_url(url: str) -> np.ndarray:
    """تحميل صورة من رابط"""
    response = requests.get(url)
    response.raise_for_status()
    image_array = np.asarray(bytearray(response.content), dtype=np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    return image

def validate_palm_image(image: np.ndarray) -> bool:
    """التحقق من صلاحية صورة بصمة الكف"""
    if image is None:
        return False
    
    # التحقق من الحجم
    if image.shape[0] < 100 or image.shape[1] < 100:
        return False
    
    # التحقق من نوع الصورة
    if len(image.shape) != 3:
        return False
    
    return True

@app.route('/api/palm-analyze', methods=['POST'])
def analyze_palm():
    """تحليل بصمة الكف"""
    try:
        data = request.get_json()
        
        if not data or 'imageUrl' not in data:
            return jsonify({'error': 'URL الصورة مطلوب'}), 400
        
        image_url = data['imageUrl']
        user_id = data.get('userId', None)
        
        # تحميل الصورة
        image = download_image_from_url(image_url)
        
        if not validate_palm_image(image):
            return jsonify({'error': 'صورة بصمة الكف غير صالحة'}), 400
        
        # تحليل الصورة باستخدام أنظمة الذكاء الاصطناعي
        analysis_result = palm_analyzer.analyze_palm(image)
        
        # معالجة الصورة لتحسين الجودة
        enhanced_features = image_processor.extract_palm_features_advanced(image)
        
        # التحقق من التزوير
        spoofing_result = anti_spoofing_system.comprehensive_spoofing_detection(image)
        
        # التحقق من جودة الصورة
        quality_score = analysis_result['quality_score']
        confidence = analysis_result['confidence']
        
        # التحقق من صلاحية التحليل
        is_valid = (
            spoofing_result['is_real'] and 
            quality_score > 0.5 and 
            confidence > 0.6
        )
        
        result = {
            'isValid': is_valid,
            'palmHash': analysis_result['palm_hash'] if is_valid else None,
            'confidence': confidence if is_valid else 0.0,
            'qualityScore': quality_score,
            'livenessScore': spoofing_result['total_score'],
            'isReal': spoofing_result['is_real'],
            'features': analysis_result['features'] if is_valid else None,
            'lines': analysis_result['lines'],
            'texture': analysis_result['texture'],
            'analysisDetails': {
                'liveness': analysis_result['liveness'],
                'quality': analysis_result['quality_score'],
                'confidence': analysis_result['confidence'],
                'spoofingDetection': spoofing_result
            }
        }
        
        logger.info(f"تحليل بصمة الكف {'ناجح' if is_valid else 'غير ناجح'} لـ {user_id}")
        
        return jsonify(result), 200
        
    except requests.exceptions.RequestException:
        return jsonify({'error': 'لا يمكن تحميل الصورة من الرابط المحدد'}), 400
    except Exception as e:
        logger.error(f"خطأ في تحليل بصمة الكف: {str(e)}")
        return jsonify({'error': 'حدث خطأ أثناء تحليل بصمة الكف'}), 500

@app.route('/api/palm-register', methods=['POST'])
def register_palm():
    """تسجيل بصمة الكف جديدة"""
    try:
        data = request.get_json()
        
        if not data or 'imageUrl' not in data or 'userId' not in data:
            return jsonify({'error': 'URL الصورة ومعرف المستخدم مطلوبين'}), 400
        
        image_url = data['imageUrl']
        user_id = data['userId']
        
        # تحميل الصورة
        image = download_image_from_url(image_url)
        
        if not validate_palm_image(image):
            return jsonify({'error': 'صورة بصمة الكف غير صالحة'}), 400
        
        # تحليل الصورة
        analysis_result = palm_analyzer.analyze_palm(image)
        
        # التحقق من التزوير
        spoofing_result = anti_spoofing_system.comprehensive_spoofing_detection(image)
        
        if not spoofing_result['is_real']:
            return jsonify({'error': 'تم اكتشاف تزوير - الصورة ليست حقيقية'}), 400
        
        # إضافة العينة إلى نظام المطابقة
        feature_vector = np.array(analysis_result['features'])
        biometric_matcher.add_palm_sample(feature_vector, f'user_{user_id}', user_id)
        
        result = {
            'success': True,
            'palmHash': analysis_result['palm_hash'],
            'userId': user_id,
            'confidence': analysis_result['confidence']
        }
        
        logger.info(f"تم تسجيل بصمة الكف لمستخدم {user_id}")
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"خطأ في تسجيل بصمة الكف: {str(e)}")
        return jsonify({'error': 'حدث خطأ أثناء تسجيل بصمة الكف'}), 500

@app.route('/api/palm-verify', methods=['POST'])
def verify_palm():
    """التحقق من بصمة الكف"""
    try:
        data = request.get_json()
        
        if not data or 'imageUrl' not in data or 'userId' not in data:
            return jsonify({'error': 'URL الصورة ومعرف المستخدم مطلوبين'}), 400
        
        image_url = data['imageUrl']
        user_id = data['userId']
        
        # تحميل الصورة
        image = download_image_from_url(image_url)
        
        if not validate_palm_image(image):
            return jsonify({'error': 'صورة بصمة الكف غير صالحة'}), 400
        
        # تحليل الصورة
        analysis_result = palm_analyzer.analyze_palm(image)
        
        # التحقق من التزوير
        spoofing_result = anti_spoofing_system.comprehensive_spoofing_detection(image)
        
        if not spoofing_result['is_real']:
            return jsonify({'error': 'تم اكتشاف تزوير - الصورة ليست حقيقية'}), 400
        
        # مطابقة بصمة الكف
        feature_vector = np.array(analysis_result['features'])
        match_result = biometric_matcher.match_palm_print(feature_vector)
        
        is_verified = match_result['is_match'] and match_result['match_details']['user_id'] == user_id
        
        result = {
            'isVerified': is_verified,
            'confidence': match_result['confidence'],
            'similarity': match_result['similarity_score'],
            'userId': user_id,
            'analysisDetails': {
                'liveness': analysis_result['liveness'],
                'quality': analysis_result['quality_score'],
                'spoofingDetection': spoofing_result,
                'matchResult': match_result
            }
        }
        
        logger.info(f"التحقق من بصمة الكف {'ناجح' if is_verified else 'غير ناجح'} لـ {user_id}")
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"خطأ في التحقق من بصمة الكف: {str(e)}")
        return jsonify({'error': 'حدث خطأ أثناء التحقق من بصمة الكف'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """التحقق من صحة الخدمة"""
    return jsonify({
        'status': 'healthy',
        'services': {
            'palm_analyzer': True,
            'image_processor': True,
            'biometric_matcher': True,
            'anti_spoofing': True
        }
    }), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)