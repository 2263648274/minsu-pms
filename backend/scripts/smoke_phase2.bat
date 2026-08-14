@echo off
setlocal
set "LOGIN=C:\Users\22636\AppData\Local\Temp\login.json"
set "BASE=http://localhost:8090/api"

rem 提取 token
for /f "tokens=2 delims=:,}" %%a in ('findstr /C:"token" %LOGIN%') do (
  set "T=%%~a"
)
set "T=%T:"=%"
set "AUTH=Authorization: Bearer %T%"

echo =============================
echo 1) /api/sync-logs/stats
echo =============================
curl -s -H "%AUTH%" "%BASE%/sync-logs/stats"
echo.
echo =============================
echo 2) /api/sync-logs (page 1)
echo =============================
curl -s -H "%AUTH%" "%BASE%/sync-logs?current=1&size=5"
echo.
echo =============================
echo 3) /api/payments (page 1)
echo =============================
curl -s -H "%AUTH%" "%BASE%/payments?current=1&size=5"
echo.
echo =============================
echo 4) /api/finance/stats?month=2026-08
echo =============================
curl -s -H "%AUTH%" "%BASE%/finance/stats?month=2026-08"
echo.
echo =============================
echo 5) /api/finance/channel-settlements?month=2026-08
echo =============================
curl -s -H "%AUTH%" "%BASE%/finance/channel-settlements?month=2026-08"
echo.
echo =============================
echo 6) /api/finance/order-settlements?month=2026-08
echo =============================
curl -s -H "%AUTH%" "%BASE%/finance/order-settlements?month=2026-08&current=1&size=5"
echo.
echo =============================
echo 7) /api/reports/overview
echo =============================
curl -s -H "%AUTH%" "%BASE%/reports/overview"
echo.
echo =============================
echo 8) /api/reports/trend
echo =============================
curl -s -H "%AUTH%" "%BASE%/reports/trend"
echo.
echo =============================
echo 9) /api/reports/channel-breakdown
echo =============================
curl -s -H "%AUTH%" "%BASE%/reports/channel-breakdown"
echo.
echo =============================
echo 10) /api/reports/roomtype-breakdown
echo =============================
curl -s -H "%AUTH%" "%BASE%/reports/roomtype-breakdown"
echo.
