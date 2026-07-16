# Start MedFusion AI Stack

Write-Host "Starting MedFusion AI Suite..." -ForegroundColor Cyan

# Start Backend
Write-Host "Initializing Backend (Django) on Port 8001..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", ".\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8001" -WorkingDirectory "$PSScriptRoot\backend"

# Start Frontend
Write-Host "Initializing Frontend (React) on Port 5174..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WorkingDirectory "$PSScriptRoot\frontend"

Write-Host "Bootstrapping complete. Access the platform at http://localhost:5174" -ForegroundColor Magenta
