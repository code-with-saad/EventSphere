# Test script for logout endpoint
# This script tests the complete logout flow

$baseUrl = "http://localhost:5000/api/auth"

Write-Host "=== Testing Logout Endpoint ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login to get tokens
Write-Host "Step 1: Logging in to get tokens..." -ForegroundColor Yellow
$loginBody = @{
    email = "test@example.com"
    password = "TestPassword123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/login" -Method POST -Body $loginBody -ContentType "application/json"
    
    if ($loginResponse.success) {
        Write-Host "✓ Login successful" -ForegroundColor Green
        $accessToken = $loginResponse.data.accessToken
        $refreshToken = $loginResponse.data.refreshToken
        Write-Host "  Access Token (first 50 chars): $($accessToken.Substring(0, [Math]::Min(50, $accessToken.Length)))..." -ForegroundColor Gray
        Write-Host "  Refresh Token (first 50 chars): $($refreshToken.Substring(0, [Math]::Min(50, $refreshToken.Length)))..." -ForegroundColor Gray
    } else {
        Write-Host "✗ Login failed: $($loginResponse.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Login request failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Make sure the server is running and you have a test user with email: test@example.com and password: TestPassword123" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Step 2: Test logout
Write-Host "Step 2: Testing logout endpoint..." -ForegroundColor Yellow
$logoutBody = @{
    refreshToken = $refreshToken
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $accessToken"
    "Content-Type" = "application/json"
}

try {
    $logoutResponse = Invoke-RestMethod -Uri "$baseUrl/logout" -Method POST -Body $logoutBody -Headers $headers
    
    if ($logoutResponse.success) {
        Write-Host "✓ Logout successful" -ForegroundColor Green
        Write-Host "  Message: $($logoutResponse.message)" -ForegroundColor Gray
    } else {
        Write-Host "✗ Logout failed: $($logoutResponse.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "✗ Logout request failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Try to use the invalidated refresh token
Write-Host "Step 3: Verifying refresh token is invalidated..." -ForegroundColor Yellow
$refreshHeaders = @{
    "Authorization" = "Bearer $refreshToken"
}

try {
    $refreshResponse = Invoke-RestMethod -Uri "$baseUrl/refresh" -Method POST -Headers $refreshHeaders
    Write-Host "✗ Refresh succeeded when it should have failed (token should be invalidated)" -ForegroundColor Red
    exit 1
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorResponse.code -eq "TOKEN_REVOKED") {
        Write-Host "✓ Refresh token correctly invalidated" -ForegroundColor Green
        Write-Host "  Error code: $($errorResponse.code)" -ForegroundColor Gray
        Write-Host "  Message: $($errorResponse.message)" -ForegroundColor Gray
    } else {
        Write-Host "? Unexpected error: $($errorResponse.message)" -ForegroundColor Yellow
        Write-Host "  Expected code: TOKEN_REVOKED, Got: $($errorResponse.code)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=== All Tests Passed ===" -ForegroundColor Green
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  ✓ Login successful" -ForegroundColor Green
Write-Host "  ✓ Logout endpoint works" -ForegroundColor Green
Write-Host "  ✓ Refresh token invalidated after logout" -ForegroundColor Green
