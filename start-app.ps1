# PMS launcher.
# Default mode launches backend/frontend in background and exits immediately.
# Optional blocking verification: .\start-app.ps1 -Wait
param(
    [switch]$Wait
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $root 'backend'
$logDir = Join-Path $backendDir 'logs'
$beOut = Join-Path $logDir 'spring-boot.log'
$beErr = Join-Path $logDir 'spring-boot.err.log'
$feOut = Join-Path $root 'frontend.log'
$feErr = Join-Path $root 'frontend.err.log'

function Fail([int]$Code, [string]$Message) {
    Write-Host "[FAIL] $Message" -ForegroundColor Red
    exit $Code
}

function Test-TcpPort([int]$Port) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $async = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
        $ok = $async.AsyncWaitHandle.WaitOne(700, $false)
        $client.Close()
        return $ok
    } catch {
        return $false
    }
}

function Test-HttpEndpoint([string]$Url) {
    try {
        $request = [System.Net.HttpWebRequest]::Create($Url)
        $request.Method = 'GET'
        $request.Timeout = 1500
        $response = $request.GetResponse()
        $response.Close()
        return $true
    } catch [System.Net.WebException] {
        if ($_.Exception.Response) {
            $_.Exception.Response.Close()
            return $true
        }
        return $false
    } catch {
        return $false
    }
}

Write-Host '=== PMS Start ==='
Write-Host '[1/3] Checking MySQL 127.0.0.1:3306 ...'
if (-not (Test-TcpPort 3306)) {
    Fail 3 'MySQL is not listening on 127.0.0.1:3306.'
}
Write-Host '    MySQL OK' -ForegroundColor Green

Write-Host '[2/3] Stopping old project processes ...'
$seen = New-Object 'System.Collections.Generic.HashSet[int]'
foreach ($port in @(8090, 5173)) {
    $rows = netstat -ano | Select-String ":$port\s+.*LISTENING"
    foreach ($row in $rows) {
        $parts = ($row -replace '\s+', ' ').Trim().Split(' ')
        $procId = $parts[$parts.Length - 1]
        if ($procId -match '^\d+$' -and $seen.Add([int]$procId)) {
            Stop-Process -Id ([int]$procId) -Force -ErrorAction SilentlyContinue
            Write-Host "    stopped PID $procId"
        }
    }
}
if ($seen.Count -eq 0) {
    Write-Host '    ports already free'
}

Write-Host '[3/3] Launching backend and frontend ...'
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}
try {
    $mvn = (Get-Command mvn.cmd -ErrorAction Stop).Source
} catch {
    Fail 3 'mvn.cmd was not found in PATH.'
}
try {
    $npm = (Get-Command npm.cmd -ErrorAction Stop).Source
} catch {
    Fail 3 'npm.cmd was not found in PATH.'
}

Start-Process -FilePath $mvn -ArgumentList @('spring-boot:run', '-Dspring-boot.run.fork=false', '-Dspring-boot.run.profiles=dev') -WorkingDirectory $backendDir -WindowStyle Hidden -RedirectStandardOutput $beOut -RedirectStandardError $beErr | Out-Null
Start-Process -FilePath $npm -ArgumentList @('run', 'dev', '--', '--host', '127.0.0.1', '--port', '5173') -WorkingDirectory $root -WindowStyle Hidden -RedirectStandardOutput $feOut -RedirectStandardError $feErr | Out-Null

if (-not $Wait) {
    Write-Host 'Launched in background. This script exits now.' -ForegroundColor Green
    Write-Host 'Backend log: backend/logs/spring-boot.log'
    Write-Host 'Frontend log: frontend.log'
    Write-Host 'Run .\start-app.ps1 -Wait to verify readiness.'
    exit 0
}

Write-Host 'Waiting for readiness (up to 120 seconds) ...'
$deadline = (Get-Date).AddSeconds(120)
$backendOk = $false
$frontendOk = $false
while ((Get-Date) -lt $deadline) {
    $backendOk = (Test-TcpPort 8090) -and (Test-HttpEndpoint 'http://127.0.0.1:8090/api/health')
    $frontendOk = Test-TcpPort 5173
    if ($backendOk -and $frontendOk) {
        break
    }
    Start-Sleep -Seconds 2
}

if (-not $backendOk) {
    Write-Host 'Backend readiness check failed.' -ForegroundColor Red
    exit 1
}
if (-not $frontendOk) {
    Write-Host 'Frontend readiness check failed.' -ForegroundColor Red
    exit 2
}

Write-Host 'Backend HTTP 8090 OK' -ForegroundColor Green
Write-Host 'Frontend TCP 5173 OK' -ForegroundColor Green
exit 0
