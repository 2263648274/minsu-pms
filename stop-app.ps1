# 民宿 PMS 关闭（被 stop-app.bat 调用）
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=== PMS Stop ==="
$killed = 0
foreach ($port in @(8090, 5173)) {
    $conns = netstat -ano | Select-String ":$port" | Select-String "LISTENING"
    foreach ($line in $conns) {
        $parts = ($line -replace '\s+', ' ').Trim().Split(' ')
        $procId = $parts[$parts.Length - 1]
        if ($procId -match '^\d+$') {
            Stop-Process -Id $procId -Force -ErrorAction Stop
            $killed++
            Write-Host "    - killed PID $procId (port $port)"
        }
    }
}
if ($killed -eq 0) {
    Write-Host "No processes on 8090/5173"
} else {
    Write-Host ""
    Write-Host "Killed $killed process(es)"
}
Write-Host "XKZOOM Desktop 5174 is not affected"