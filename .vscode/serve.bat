@echo off
chcp 65001 >nul
set PORT=3000
echo ========================================
echo  🐙 章鱼喷墨机 - 本地服务器
echo ========================================
echo.
echo  正在启动 Node.js 服务器...
echo  访问地址: http://localhost:%PORT%
echo  按 Ctrl+C 停止服务器
echo.

:: 使用 Node.js 服务器脚本
node "%~dp0serve.js" %PORT%
if %ERRORLEVEL% NEQ 0 (
  echo [错误] 启动失败，请确认 Node.js 已安装
  echo 下载: https://nodejs.org/
  pause
)
