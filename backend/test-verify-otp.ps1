# Test script for POST /api/auth/verify-otp endpoint
# This script tests the OTP verification endpoint manually

$baseUrl = "http://localhost:5000"
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "Testing OTP Verification Endpoint" -ForegroundColor Cyan
Write-Host "==================================`n" -ForegroundColor Cyan

# Test 1: Missing required fields
Write-Host "Test 1: Missing required fields (email)" -ForegroundColor Yellow
$body = @{
    otp = "123456"
    purpose = "registration"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/verify-otp" -Method POST -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($statusCode -eq 400 -and $errorBody.message -like "*Missing required fields*") {
        Write-Host "✓ PASSED: Returns 400 for missing fields" -ForegroundColor Green
    } else {
        Write-Host "✗ FAILED: Expected 400, got $statusCode" -ForegroundColor Red
    }
}

Write-Host "`n"

# Test 2: Invalid purpose
Write-Host "Test 2: Invalid purpose" -ForegroundColor Yellow
$body = @{
    email = "test@example.com"
    otp = "123456"
    purpose = "invalid_purpose"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/verify-otp" -Method POST -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($statusCode -eq 400 -and $errorBody.message -like "*Invalid purpose*") {
        Write-Host "✓ PASSED: Returns 400 for invalid purpose" -ForegroundColor Green
    } else {
        Write-Host "✗ FAILED: Expected 400, got $statusCode" -ForegroundColor Red
    }
}

Write-Host "`n"

# Test 3: User not found
Write-Host "Test 3: User not found" -ForegroundColor Yellow
$body = @{
    email = "nonexistent@example.com"
    otp = "123456"
    purpose = "registration"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/auth/verify-otp" -Method POST -Headers $headers -Body $body -ErrorAction Stop
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($statusCode -eq 404 -and $errorBody.message -eq "User not found") {
        Write-Host "✓ PASSED: Returns 404 for non-existent user" -ForegroundColor Green
    } else {
        Write-Host "✗ FAILED: Expected 404, got $statusCode" -ForegroundColor Red
        Write-Host "Message: $($errorBody.message)" -ForegroundColor Red
    }
}

Write-Host "`n"

# Test 4: Invalid OTP (requires a registered user)
Write-Host "Test 4: Invalid OTP (requires an existing user with pending OTP)" -ForegroundColor Yellow
Write-Host "NOTE: This requires a user to be registered first" -ForegroundColor Gray
Write-Host "Run this after registering an exhibitor or attendee" -ForegroundColor Gray
Write-Host "`n"

Write-Host "==================================`n" -ForegroundColor Cyan
Write-Host "Basic validation tests completed!" -ForegroundColor Green
Write-Host "To test full flow:" -ForegroundColor Yellow
Write-Host "1. Register an exhibitor/attendee using test-registration.ps1" -ForegroundColor Gray
Write-Host "2. Check email for OTP" -ForegroundColor Gray
Write-Host "3. Use the OTP with this endpoint" -ForegroundColor Gray
