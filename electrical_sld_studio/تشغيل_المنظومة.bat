@echo off
chcp 65001 >nul
title المنظومة الهندسية الذكية SLD Studio - ENG-MOSTAFAELMGHRABY
color 0B

echo =====================================================================
echo           شركة مصر الوسطى لتوزيع الكهرباء - قطاع المنيا شمال
echo           المنظومة الهندسية الذكية لتصميم ومحاكاة مخططات الجهد المتوسط
echo                  المطور: م / مصطفى المغربي (01124158545)
echo =====================================================================
echo.

cd /d "%~dp0"

:: 1. البحث التلقائي عن مفسر بايثون
set "PY_CMD="

if exist "%~dp0python\python.exe" (
    set "PY_CMD=%~dp0python\python.exe"
    echo [✔] تم العثور على بيئة بايثون المحمولة المدمجة.
) else if exist "C:\Python314\python.exe" (
    set "PY_CMD=C:\Python314\python.exe"
    echo [✔] تم العثور على بايثون النظام C:\Python314\python.exe.
) else (
    where python >nul 2>&1
    if %errorlevel% equ 0 (
        set "PY_CMD=python"
        echo [✔] تم العثور على بايثون في متغيرات البيئة.
    ) else (
        where py >nul 2>&1
        if %errorlevel% equ 0 (
            set "PY_CMD=py"
            echo [✔] تم العثور على مشغل بايثون py.
        )
    )
)

if "%PY_CMD%"=="" (
    echo [X] تنبيه: لم يتم العثور على بايثون مثبت على هذا الجهاز!
    echo يرجى تثبيت بايثون من الموقع الرسمي python.org أو تشغيل المثبت المرفق.
    pause
    exit /b 1
)

:: 2. التحقق من تثبيت مكتبات النظام
echo [ℹ] جاري التحقق من المكتبات المطلوبة (bottle, openpyxl, pptx, PIL)...
"%PY_CMD%" -c "import bottle, openpyxl, pptx, PIL" >nul 2>&1
if %errorlevel% neq 0 (
    echo [ℹ] جاري تثبيت المكتبات اللازمة تلقائياً من requirements.txt...
    "%PY_CMD%" -m pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo [!] تعذر التثبيت التلقائي، جاري المتابعة...
    )
)

:: 3. تشغيل خادم المنظومة وفتح المتصفح
echo.
echo [⚡] جاري تشغيل المنظومة الهندسية الذكية على المنفذ 7890...
echo [🌐] سيتم فتح المتصفح تلقائياً على الرابط: http://localhost:7890
echo.

start "" "http://localhost:7890"
"%PY_CMD%" app.py

pause
