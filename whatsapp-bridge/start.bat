@echo off
echo ==========================================
echo  Legacy WhatsApp Bridge - Iniciando...
echo ==========================================

:: Matar processo antigo na porta 8081
echo [1/3] Liberando porta 8081...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8081 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: Ir para o diretório correto
cd /d "%~dp0"

echo [2/3] Verificando sessao...
if "%1"=="--reset" (
    echo [RESET] Limpando sessao legacy-crm...
    rmdir /s /q sessions\legacy-crm 2>nul
    echo [RESET] Sessao removida. Escaneie o QR novamente.
)

echo [3/3] Iniciando bridge...
node server.js
