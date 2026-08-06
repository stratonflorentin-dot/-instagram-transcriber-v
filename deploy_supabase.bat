@echo off
echo ===================================================
echo   Deploying Instagram Transcriber to Supabase
echo ===================================================
echo.

set PROJECT_REF=knwzzllrgsmwwbjpotbc

if "%GROQ_API_KEY%"=="" (
    echo GROQ_API_KEY environment variable is not set.
    echo Get a key from https://console.groq.com/keys, then run:
    echo   set GROQ_API_KEY=your_key_here
    echo before running this script again.
    exit /b 1
)

echo [1/3] Linking Supabase Project (%PROJECT_REF%)...
call npx supabase link --project-ref %PROJECT_REF%
if %ERRORLEVEL% neq 0 (
    echo Error linking project. Please make sure you are logged in ^(npx supabase login^).
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Setting secrets in Supabase...
call npx supabase secrets set GROQ_API_KEY=%GROQ_API_KEY%
if %ERRORLEVEL% neq 0 (
    echo Error setting secret.
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Deploying Edge Functions...
call npx supabase functions deploy transcribe --no-verify-jwt
call npx supabase functions deploy transcribe-file --no-verify-jwt
if %ERRORLEVEL% neq 0 (
    echo Error deploying functions.
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo   Success! 
echo   Make sure to run the SQL in migrations/001_create_jobs.sql
echo   in your Supabase Dashboard SQL Editor.
echo ===================================================
pause
