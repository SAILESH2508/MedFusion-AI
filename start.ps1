# Start MedFusion AI Stack

Write-Host "Starting MedFusion AI Suite..." -ForegroundColor Cyan

# Start Backend
Write-Host "Initializing Backend (Django) on Port 8000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python manage.py runserver 0.0.0.0:8000" -WorkingDirectory "$PSScriptRoot\backend"

# Start Frontend
Write-Host "Initializing Frontend (React) on Port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WorkingDirectory "$PSScriptRoot\frontend"

Write-Host "Bootstrapping complete. Access the platform at http://localhost:5173" -ForegroundColor Magenta
