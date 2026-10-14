# Start MedFusion AI Stack

Write-Host "Starting MedFusion AI Suite..." -ForegroundColor Cyan

$BackendDir = Join-Path $PSScriptRoot "backend"
$FrontendDir = Join-Path $PSScriptRoot "frontend"
$PythonExe = Join-Path $BackendDir ".venv\Scripts\python.exe"

# Start Backend
Write-Host "Initializing Backend (Django) on Port 8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "cd '$BackendDir'; & '$PythonExe' manage.py runserver 127.0.0.1:8000"

# Start Frontend
Write-Host "Initializing Frontend (React) on Port 5174..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-Command", "cd '$FrontendDir'; npm run dev"

Write-Host "Bootstrapping complete. Access the platform at http://localhost:5174" -ForegroundColor Magenta

