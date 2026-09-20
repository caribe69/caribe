@echo off
title Sol Caribe - Agente de Impresion
cd /d "%~dp0"
echo Iniciando el Agente de Impresion de Sol Caribe...
start "" http://localhost:9110
node server.js
echo.
echo El agente se detuvo. Cierra esta ventana o presiona una tecla.
pause >nul
