# تطبيق نتائج ديرب نجم - Android

المشروع يستخدم Capacitor لتحويل نسخة الويب إلى تطبيق Android.

## البناء محليًا

```bash
npm install
npm run build
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```

ملف APK الناتج:
`android/app/build/outputs/apk/debug/app-debug.apk`

## البناء المجاني على GitHub

ارفع الملفات إلى GitHub ثم افتح تبويب **Actions** وشغّل **Build Android APK**.
سيظهر ملف APK في قسم **Artifacts**.

ملاحظة: ميزة توليد شعارات الفرق تستخدم API الموقع المنشور المحدد في `VITE_API_BASE_URL`.
