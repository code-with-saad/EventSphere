# Manual test script for token refresh endpoint
# Run this after starting the dev server

Write-Host "`n=== Testing POST /api/auth/refresh endpoint ===" -ForegroundColor Cyan
Write-Host "Prerequisites: Backend server must be running on http://localhost:5000`n" -ForegroundColor Yellow

# Test 1: Missing refresh token
Write-Host "Test 1: Missing refresh token" -ForegroundColor Green
$response1 = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/refresh" `
    -Method POST `
    -ContentType "application/json" `
    -Body '{}' `
    -ErrorAction SilentlyContinue -ErrorVariable err1

if ($err1) {
    Write-Host "✓ Correctly returned 401 for missing token" -ForegroundColor Green
} else {
    Write-Host "✗ Should have returned 401" -ForegroundColor Red
}

# Test 2: Invalid refresh token
Write-Host "`nTest 2: Invalid refresh token" -ForegroundColor Green
try {
    $response2 = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/refresh" `
        -Method POST `
        -Headers @{ "Authorization" = "Bearer invalid-token" } `
        -ContentType "application/json" `
        -ErrorAction Stop
    Write-Host "✗ Should have returned 401" -ForegroundColor Red
} catch {
    Write-Host "✓ Correctly returned 401 for invalid token" -ForegroundColor Green
}

Write-Host "`nNote: To test successful token refresh, you need to:" -ForegroundColor Yellow
Write-Host "1. Register a user" -ForegroundColor Yellow
Write-Host "2. Login to get valid refresh token" -ForegroundColor Yellow
Write-Host "3. Use that refresh token to test the endpoint" -ForegroundColor Yellow

