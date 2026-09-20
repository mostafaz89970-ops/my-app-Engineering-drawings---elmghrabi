@echo off
chcp 65001 >nul
title نشر التطبيق على Firebase Hosting - م/ مصطفى المغربي
echo ========================================================
echo   نشر استوديو الرسومات الهندسية على Firebase Hosting
echo   شركة مصر الوسطى لتوزيع الكهرباء - م/ مصطفى المغربي
echo ========================================================
echo.
set NODE_TLS_REJECT_UNAUTHORIZED=0

echo [1/3] التحقق من تسجيل الدخول إلى Firebase...
call firebase login
echo.
echo [2/3] جاري رفع ونشر التطبيق إلى Firebase Hosting...
call firebase deploy --only hosting
echo.
echo ========================================================
echo [3/3] اكتمل النشر بنجاح!
echo افتح الرابط الموضح أعلاه (https://...web.app) في المتصفح.
echo ========================================================
pause
