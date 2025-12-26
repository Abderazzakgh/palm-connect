# نظام تحليل بصمة الكف الذكي

نظام متطور لتحليل بصمات الكف باستخدام الذكاء الاصطناعي والتقنيات البيومترية المتقدمة.

## الميزات

- تحليل بصمات الكف بدقة عالية
- خوارزميات معالجة الصور المتقدمة
- خوارزميات PCA وSVM للمطابقة البيومترية
- شبكة عصبية عميقة (CNN) للتحليل المتقدم
- آليات مكافحة التزوير (Anti-spoofing)
- واجهة برمجة تطبيقات (API) لتكامل سهل

## المتطلبات

- Python 3.8+
- pip

## التثبيت

```bash
pip install -r requirements.txt
```

## التشغيل

```bash
python api.py
```

## واجهة برمجة التطبيقات (API)

### تحليل بصمة الكف
```
POST /api/palm-analyze
Content-Type: application/json

{
  "imageUrl": "https://example.com/palm-image.jpg",
  "userId": "user123"
}
```

### تسجيل بصمة الكف
```
POST /api/palm-register
Content-Type: application/json

{
  "imageUrl": "https://example.com/palm-image.jpg",
  "userId": "user123"
}
```

### التحقق من بصمة الكف
```
POST /api/palm-verify
Content-Type: application/json

{
  "imageUrl": "https://example.com/palm-image.jpg",
  "userId": "user123"
}
```

## المكونات

- `palm_analyzer.py`: تحليل بصمات الكف باستخدام OpenCV وTensorFlow
- `image_processor.py`: خوارزميات معالجة الصور لتحسين الجودة
- `biometric_matcher.py`: خوارزميات PCA وSVM للمطابقة البيومترية
- `deep_cnn_analyzer.py`: شبكة عصبية عميقة CNN للتحليل المتقدم
- `anti_spoofing.py`: آليات مكافحة التزوير (الحرارة، تدفق الدم)
- `api.py`: واجهة برمجة تطبيقات Flask لتحليل بصمات الكف

## مثال على الاستخدام

```python
from palm_analyzer import PalmAnalyzer
import cv2

analyzer = PalmAnalyzer()
image = cv2.imread('palm_image.jpg')
result = analyzer.analyze_palm(image)
print(result)
```