"""
نظام تحليل بصمة الكف باستخدام شبكة عصبية عميقة (CNN)
يستخدم TensorFlow/Keras لبناء وتدريب نموذج متخصص في تحليل بصمات الكف
"""
import tensorflow as tf
from tensorflow.keras.models import Model, Sequential
from tensorflow.keras.layers import (
    Conv2D, MaxPooling2D, GlobalAveragePooling2D, 
    Dense, Dropout, BatchNormalization, Input, 
    Activation, Add, GlobalMaxPooling2D
)
from tensorflow.keras.applications import ResNet50, VGG16, EfficientNetB0
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping, ReduceLROnPlateau, ModelCheckpoint
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.regularizers import l2
import numpy as np
from typing import Tuple, Optional, Dict, List
import logging

class DeepCNNAnalyzer:
    def __init__(self, input_shape: Tuple[int, int, int] = (224, 224, 3), num_classes: int = 128):
        self.logger = logging.getLogger(__name__)
        self.input_shape = input_shape
        self.num_classes = num_classes
        self.model = None
        self.trained = False
        
        # إعداد TensorFlow
        tf.config.run_functions_eagerly(False)  # لتحسين الأداء
        
    def build_custom_cnn(self) -> Model:
        """بناء نموذج CNN مخصص لتحليل بصمات الكف"""
        inputs = Input(shape=self.input_shape)
        
        # طبقة الإدخال مع التطبيع
        x = tf.cast(inputs, tf.float32) / 255.0
        
        # طبقة 1
        x = Conv2D(32, (3, 3), padding='same', kernel_regularizer=l2(1e-4))(x)
        x = BatchNormalization()(x)
        x = Activation('relu')(x)
        x = MaxPooling2D((2, 2))(x)
        
        # طبقة 2
        x = Conv2D(64, (3, 3), padding='same', kernel_regularizer=l2(1e-4))(x)
        x = BatchNormalization()(x)
        x = Activation('relu')(x)
        x = MaxPooling2D((2, 2))(x)
        
        # طبقة 3
        x = Conv2D(128, (3, 3), padding='same', kernel_regularizer=l2(1e-4))(x)
        x = BatchNormalization()(x)
        x = Activation('relu')(x)
        x = MaxPooling2D((2, 2))(x)
        
        # طبقة 4
        x = Conv2D(256, (3, 3), padding='same', kernel_regularizer=l2(1e-4))(x)
        x = BatchNormalization()(x)
        x = Activation('relu')(x)
        x = MaxPooling2D((2, 2))(x)
        
        # طبقة 5
        x = Conv2D(512, (3, 3), padding='same', kernel_regularizer=l2(1e-4))(x)
        x = BatchNormalization()(x)
        x = Activation('relu')(x)
        
        # تجميع الميزات
        x = GlobalAveragePooling2D()(x)
        x = Dropout(0.5)(x)
        
        # طبقات متصلة كثيفة
        x = Dense(512, activation='relu', kernel_regularizer=l2(1e-4))(x)
        x = BatchNormalization()(x)
        x = Dropout(0.5)(x)
        
        x = Dense(256, activation='relu', kernel_regularizer=l2(1e-4))(x)
        x = BatchNormalization()(x)
        x = Dropout(0.3)(x)
        
        # طبقة المخرجات - متجه مميزات لتحليل بصمة الكف
        features = Dense(self.num_classes, activation='sigmoid', name='features')(x)
        
        model = Model(inputs=inputs, outputs=features)
        
        return model
    
    def build_transfer_learning_model(self, base_model_name: str = 'ResNet50') -> Model:
        """بناء نموذج باستخدام التعلم النقل (Transfer Learning)"""
        inputs = Input(shape=self.input_shape)
        
        # اختيار نموذج أساسي
        if base_model_name == 'ResNet50':
            base_model = ResNet50(weights='imagenet', include_top=False, input_tensor=inputs)
        elif base_model_name == 'VGG16':
            base_model = VGG16(weights='imagenet', include_top=False, input_tensor=inputs)
        elif base_model_name == 'EfficientNetB0':
            base_model = EfficientNetB0(weights='imagenet', include_top=False, input_tensor=inputs)
        else:
            raise ValueError(f"النموذج غير مدعوم: {base_model_name}")
        
        # تجميد طبقات النموذج الأساسي
        base_model.trainable = False
        
        # إضافة طبقات متخصصة
        x = base_model.output
        x = GlobalAveragePooling2D()(x)
        x = BatchNormalization()(x)
        x = Dense(512, activation='relu')(x)
        x = Dropout(0.5)(x)
        x = Dense(256, activation='relu')(x)
        x = Dropout(0.3)(x)
        
        # طبقة المخرجات
        features = Dense(self.num_classes, activation='sigmoid', name='features')(x)
        
        model = Model(inputs=inputs, outputs=features)
        
        return model
    
    def compile_model(self, model: Model, learning_rate: float = 0.001) -> Model:
        """تجميع النموذج"""
        model.compile(
            optimizer=Adam(learning_rate=learning_rate),
            loss='mse',  # يمكن تغييره حسب المهمة
            metrics=['mae', 'accuracy']
        )
        return model
    
    def train_model(self, 
                   train_data: np.ndarray, 
                   train_labels: np.ndarray,
                   validation_data: Optional[Tuple[np.ndarray, np.ndarray]] = None,
                   epochs: int = 50,
                   batch_size: int = 32) -> Dict:
        """تدريب النموذج"""
        if self.model is None:
            self.model = self.build_custom_cnn()
            self.model = self.compile_model(self.model)
        
        # إعداد callbacks
        callbacks = [
            EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True),
            ReduceLROnPlateau(monitor='val_loss', factor=0.2, patience=5, min_lr=1e-7),
            ModelCheckpoint('best_palm_cnn_model.h5', save_best_only=True, monitor='val_loss')
        ]
        
        # تدريب النموذج
        history = self.model.fit(
            train_data, train_labels,
            validation_data=validation_data,
            epochs=epochs,
            batch_size=batch_size,
            callbacks=callbacks,
            verbose=1
        )
        
        self.trained = True
        return history.history
    
    def extract_features(self, image: np.ndarray) -> np.ndarray:
        """استخراج الميزات من صورة الكف"""
        if not self.trained:
            raise ValueError("النموذج غير مدرّب. قم بتدريبه أولاً.")
        
        # التأكد من أن الصورة بحجم مناسب
        if image.shape != self.input_shape:
            # إذا كانت الصورة أحادية اللون، تحويلها إلى RGB
            if len(image.shape) == 2:
                image = np.stack([image] * 3, axis=-1)
            # تحجيم الصورة
            image = tf.image.resize(image, (self.input_shape[0], self.input_shape[1]))
            image = tf.cast(image, tf.float32) / 255.0
            image = tf.expand_dims(image, axis=0)  # إضافة بعد الدفعة
        
        # التنبؤ
        features = self.model.predict(image, verbose=0)
        return features[0]  # إرجاع أول عينة
    
    def predict_similarity(self, image1: np.ndarray, image2: np.ndarray) -> float:
        """حساب التشابه بين صورتي كف"""
        features1 = self.extract_features(image1)
        features2 = self.extract_features(image2)
        
        # حساب التشابه الكosi
        similarity = np.dot(features1, features2) / (np.linalg.norm(features1) * np.linalg.norm(features2))
        return float(similarity)
    
    def fine_tune_model(self, base_model_name: str = 'ResNet50'):
        """تحسين النموذج باستخدام التعلم النقل"""
        self.model = self.build_transfer_learning_model(base_model_name)
        self.model = self.compile_model(self.model, learning_rate=0.0001)
        
        # فك تجميد بعض الطبقات العليا للتحسين
        if base_model_name == 'ResNet50':
            base_model = self.model.layers[1]
        elif base_model_name == 'VGG16':
            base_model = self.model.layers[1]
        elif base_model_name == 'EfficientNetB0':
            base_model = self.model.layers[1]
        
        # فك تجميد آخر 20 طبقة
        base_model.trainable = True
        fine_tune_at = len(base_model.layers) - 20
        
        for layer in base_model.layers[:fine_tune_at]:
            layer.trainable = False
    
    def create_data_generator(self) -> ImageDataGenerator:
        """إنشاء مولد بيانات للتدريب"""
        datagen = ImageDataGenerator(
            rotation_range=15,
            width_shift_range=0.1,
            height_shift_range=0.1,
            shear_range=0.1,
            zoom_range=0.1,
            horizontal_flip=True,
            fill_mode='nearest',
            preprocessing_function=self._preprocess_image
        )
        return datagen
    
    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """تجهيز الصورة للنموذج"""
        # التطبيع
        image = image.astype(np.float32) / 255.0
        return image
    
    def save_model(self, filepath: str):
        """حفظ النموذج"""
        if self.model:
            self.model.save(filepath)
            self.logger.info(f"تم حفظ النموذج في {filepath}")
    
    def load_model(self, filepath: str):
        """تحميل النموذج"""
        self.model = tf.keras.models.load_model(filepath)
        self.trained = True
        self.logger.info(f"تم تحميل النموذج من {filepath}")
    
    def get_model_summary(self) -> str:
        """الحصول على ملخص النموذج"""
        if self.model:
            import io
            stream = io.StringIO()
            self.model.summary(print_fn=lambda x: stream.write(x + '\n'))
            summary = stream.getvalue()
            return summary
        return "النموذج غير محدد"

class AdvancedPalmCNN(DeepCNNAnalyzer):
    """نظام CNN متقدم مع دعم للتحليل الإحصائي والتحسين التلقائي"""
    
    def __init__(self, input_shape: Tuple[int, int, int] = (224, 224, 3), num_classes: int = 128):
        super().__init__(input_shape, num_classes)
        self.training_history = []
        self.feature_cache = {}
    
    def build_attention_cnn(self) -> Model:
        """بناء نموذج CNN مع اهتمام (Attention)"""
        inputs = Input(shape=self.input_shape)
        
        # التطبيع
        x = tf.cast(inputs, tf.float32) / 255.0
        
        # طبقة 1
        x1 = Conv2D(32, (3, 3), padding='same', activation='relu')(x)
        x1 = BatchNormalization()(x1)
        x1 = MaxPooling2D((2, 2))(x1)
        
        # طبقة 2
        x2 = Conv2D(64, (3, 3), padding='same', activation='relu')(x1)
        x2 = BatchNormalization()(x2)
        x2 = MaxPooling2D((2, 2))(x2)
        
        # طبقة 3
        x3 = Conv2D(128, (3, 3), padding='same', activation='relu')(x2)
        x3 = BatchNormalization()(x3)
        x3 = MaxPooling2D((2, 2))(x3)
        
        # طبقة 4
        x4 = Conv2D(256, (3, 3), padding='same', activation='relu')(x3)
        x4 = BatchNormalization()(x4)
        x4 = MaxPooling2D((2, 2))(x4)
        
        # طبقة الاهتمام
        attention = Conv2D(1, (1, 1), activation='sigmoid', name='attention_map')(x4)
        attended_features = tf.multiply(x4, attention)
        
        # تجميع الميزات
        global_features = GlobalAveragePooling2D()(attended_features)
        local_features = GlobalMaxPooling2D()(attended_features)
        
        # دمج الميزات
        combined_features = tf.concat([global_features, local_features], axis=-1)
        
        # طبقات متصلة
        x = Dense(512, activation='relu')(combined_features)
        x = BatchNormalization()(x)
        x = Dropout(0.5)(x)
        
        x = Dense(256, activation='relu')(x)
        x = BatchNormalization()(x)
        x = Dropout(0.3)(x)
        
        # متجه الميزات
        features = Dense(self.num_classes, activation='sigmoid', name='features')(x)
        
        model = Model(inputs=inputs, outputs=features)
        return model
    
    def extract_multiscale_features(self, image: np.ndarray) -> Dict[str, np.ndarray]:
        """استخراج ميزات متعددة المقاييس"""
        if not self.trained:
            raise ValueError("النموذج غير مدرّب. قم بتدريبه أولاً.")
        
        # التأكد من أن الصورة بحجم مناسب
        if image.shape != self.input_shape:
            if len(image.shape) == 2:
                image = np.stack([image] * 3, axis=-1)
            image = tf.image.resize(image, (self.input_shape[0], self.input_shape[1]))
            image = tf.cast(image, tf.float32) / 255.0
            image = tf.expand_dims(image, axis=0)
        
        # إنشاء نموذج فرعي للحصول على مخرجات الطبقات الوسطى
        intermediate_model = Model(
            inputs=self.model.input,
            outputs=[
                self.model.get_layer('attention_map').output if 'attention_map' in [l.name for l in self.model.layers] else self.model.layers[-4].output,
                self.model.output
            ]
        )
        
        intermediate_outputs = intermediate_model.predict(image, verbose=0)
        
        return {
            'attention_map': intermediate_outputs[0][0] if len(intermediate_outputs) > 0 else None,
            'features': intermediate_outputs[-1][0] if intermediate_outputs else None
        }
    
    def predict_with_uncertainty(self, image: np.ndarray, n_samples: int = 10) -> Dict[str, float]:
        """التنبؤ مع حساب عدم اليقين"""
        predictions = []
        
        # عمل عدة تنبؤات مع Dropout نشط
        for _ in range(n_samples):
            # تعيين dropout إلى نشط مؤقتاً
            self.model.layers[-1]._name = 'features_temp'  # تغيير الاسم مؤقتاً
            temp_model = Model(inputs=self.model.input, outputs=self.model.output)
            
            pred = temp_model.predict(tf.expand_dims(image, 0), verbose=0)
            predictions.append(pred[0])
            
            # استعادة الاسم الأصلي
            self.model.layers[-1]._name = 'features'
        
        predictions = np.array(predictions)
        
        return {
            'mean_prediction': predictions.mean(axis=0).tolist(),
            'std_prediction': predictions.std(axis=0).tolist(),
            'uncertainty': predictions.std(axis=0).mean().tolist() if predictions.size > 0 else 0.0
        }

# مثال على الاستخدام
if __name__ == "__main__":
    cnn_analyzer = AdvancedPalmCNN()
    
    # بناء النموذج
    cnn_analyzer.model = cnn_analyzer.build_attention_cnn()
    cnn_analyzer.model = cnn_analyzer.compile_model(cnn_analyzer.model)
    
    print("ملخص النموذج:")
    print(cnn_analyzer.get_model_summary())
    
    # مثال على بيانات تدريب وهمية
    # train_images = np.random.rand(100, 224, 224, 3)
    # train_labels = np.random.rand(100, 128)
    # 
    # # تدريب النموذج
    # # history = cnn_analyzer.train_model(train_images, train_labels, epochs=5)
    # 
    # # مثال على استخراج ميزات
    # # test_image = np.random.rand(224, 224, 3)
    # # features = cnn_analyzer.extract_features(test_image)
    # # print(f"الميزات المستخرجة: {features.shape}")