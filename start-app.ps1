# PMS one-click start (PowerShell, called by start-app.bat)
# Exit codes: 0 = all OK; 1 = backend failed; 2 = frontend failed; 3 = launcher error
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Fail {
    param([int]$Code, [string]$Msg)
    Write-Host "[FAIL] $Msg" -ForegroundColor Red
    exit $Code
}

function Show-LogTail {
    param([string]$Path, [int]$Lines = 20)
    if (Test-Path $Path) {
        Write-Host "--- tail of $Path ---" -ForegroundColor Yellow
        Get-Content $Path -Tail $Lines -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  $_" }
    } else {
        Write-Host "(log not found: $Path)" -ForegroundColor Yellow
    }
}

Write-Host "=== PMS Start ==="
Write-Host ""

# 1. Kill old processes on 8090 / 5173 (dedup PIDs: IPv4+IPv6 rows repeat the same PID)
Write-Host "[1/4] Kill old processes on 8090 / 5173 ..."
try {
    $seen = New-Object 'System.Collections.Generic.HashSet[int]'
    foreach ($port in @(8090, 5173)) {
        $conns = netstat -ano | Select-String ":$port" | Select-String "LISTENING"
        foreach ($line in $conns) {
            $parts = ($line -replace '\s+', ' ').Trim().Split(' ')
            $procId = $parts[$parts.Length - 1]
            if ($procId -match '^\d+$' -and $seen.Add([int]$procId)) {
                try {
                    Stop-Process -Id $procId -Force -ErrorAction Stop
                    Write-Host "    - killed PID $procId (port $port)"
                } catch {
                    Write-Host "    - PID $procId already gone (port $port)"
                }
            }
        }
    }
    if ($seen.Count -eq 0) { Write-Host "    - ports free" }
} catch {
    Fail 3 "kill phase crashed: $($_.Exception.Message)"
}

# 2. Start backend (hidden window)
Write-Host "[2/4] Start backend (Spring Boot 8090) ..."
$logDir = Join-Path $root 'backend\logs'
if (!(Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
$backendDir = Join-Path $root 'backend'
$beOut = Join-Path $logDir 'spring-boot.log'
$beErr = Join-Path $logDir 'spring-boot.err.log'
try {
    $mvn = (Get-Command mvn.cmd -ErrorAction Stop).Source
} catch {
    Fail 3 "mvn.cmd not found on PATH"
}
Start-Process -FilePath $mvn -ArgumentList 'spring-boot:run','-Dspring-boot.run.fork=false' -WorkingDirectory $backendDir -WindowStyle Hidden -RedirectStandardOutput $beOut -RedirectStandardError $beErr | Out-Null
Write-Host "    - backend launched, log: backend\logs\spring-boot.log"

# 3. Start frontend (hidden window)
Write-Host "[3/4] Start frontend (Vite 5173) ..."
$feOut = Join-Path $root 'frontend.log'
$feErr = Join-Path $root 'frontend.err.log'
try {
    $npm = (Get-Command npm.cmd -ErrorAction Stop).Source
} catch {
    Show-LogTail $beErr; Show-LogTail $beOut
    Fail 3 "npm.cmd not found on PATH (backend already launched, will keep running)"
}
Start-Process -FilePath $npm -ArgumentList 'run','dev','--','--port','5173' -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $feOut -RedirectStandardError $feErr | Out-Null
Write-Host "    - frontend launched, log: frontend.log"

# 4. Wait for ports
Write-Host "[4/4] Wait for ports (up to 120s) ..."
function Test-Port {
    param([int]$Port)
    try {
        $c = New-Object System.Net.Sockets.TcpClient
        $i = $c.BeginConnect('127.0.0.1', $Port, $null, $null)
        $ok = $i.AsyncWaitHandle.WaitOne(500, $false)
        $c.Close()
        return $ok
    } catch { return $false }
}
$deadline = (Get-Date).AddSeconds(120)
$backendOk = $false
$frontendOk = $false
while ((Get-Date) -lt $deadline) {
    $backendOk = Test-Port 8090
    $frontendOk = Test-Port 5173
    if ($backendOk -and $frontendOk) { break }
    Start-Sleep -Seconds 2
}

$exit = 0
if ($backendOk) {
    Write-Host "    - backend 8090 OK" -ForegroundColor Green
} else {
    Write-Host "    - backend 8090 TIMEOUT" -ForegroundColor Red
    Show-LogTail $beErr; Show-LogTail $beOut
    $exit = 1
}
if ($frontendOk) {
    Write-Host "    - frontend 5173 OK" -ForegroundColor Green
} else {
    Write-Host "    - frontend 5173 TIMEOUT" -ForegroundColor Red
    Show-LogTail $feErr; Show-LogTail $feOut
    $exit = 2
}

if ($exit -eq 0) {
    Write-Host ""
    Write-Host "=== Done ==="
    Write-Host "  Frontend: http://localhost:5173"
    Write-Host "  Backend:  http://localhost:8090"
    Write-Host "  Login:    admin / admin123"
    Write-Host ""
    Write-Host "Stop: run stop-app.bat"
}
exit $exit
