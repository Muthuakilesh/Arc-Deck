param(
    [switch]$WithStatic
)

# start-dev.ps1
# Usage: .\start-dev.ps1 [-WithStatic]
# Runs the backend (Flask + SocketIO) and opens the browser to the frontend.
# If -WithStatic is provided, also starts a simple Python static server for the frontend on port 8000.

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Determine which PowerShell executable is available (pwsh for PowerShell Core, fallback to Windows PowerShell)
if (Get-Command pwsh -ErrorAction SilentlyContinue) {
    $shellExe = 'pwsh'
} else {
    $shellExe = 'powershell'
}

function Start-Backend {
    $backendDir = Join-Path $root "backend"
    $pythonExe = (Get-Command python -ErrorAction Stop).Source
    Write-Host "Launching backend using $pythonExe in: $backendDir"
    Start-Process -FilePath $pythonExe -ArgumentList '-u','app.py' -WorkingDirectory $backendDir
}

function Start-Static {
    $frontendDir = Join-Path $root "frontend"
    $pythonExe = (Get-Command python -ErrorAction Stop).Source
    Write-Host "Launching static server using $pythonExe in: $frontendDir"
    Start-Process -FilePath $pythonExe -ArgumentList '-m','http.server','8000' -WorkingDirectory $frontendDir
}

Write-Host "Starting ArcDeck backend..."
Start-Backend

if ($WithStatic) {
    Write-Host "Starting simple static server for frontend at http://localhost:8000 (optional)..."
    Start-Static
    Start-Sleep -Seconds 1
    Start-Process "http://localhost:8000"
} else {
    Start-Sleep -Seconds 2
    Start-Process "http://localhost:5000"
}

Write-Host "Done. Backend should be running (check terminal)."
