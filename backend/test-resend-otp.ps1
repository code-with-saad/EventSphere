# Test script for resend-otp endpoint
# This tests the POST /api/auth/resend-otp endpoint

$baseUrl = "http://localhost:5000"

Write-Host "`n=== Testing OTP Resend Endpoint ===" -ForegroundColor Cyan

# First, register a test user to create an OTP
Write-Host "`n1. Registering test user (Exhibitor)..." -ForegroundColor Yellow
$registerBody = @{
    email = "resend-test-$(Get-Random)@example.com"
    password = "TestPass123"
    fullName = "Resend Test User"
    role = "exhibitor"
} | ConvertTo-Json

$registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method Post -Body $registerBody -ContentType "application/json"
Write-Host "Registration Response:" -ForegroundColor Green
$registerResponse | ConvertTo-Json -Depth 10

$testEmail = $registerResponse.user.email

# Test Case 1: Resend OTP (First attempt)
Write-Host "`n2. Testing OTP resend (First attempt)..." -ForegroundColor Yellow
$resendBody = @{
    email = $testEmail
    purpose = "registration"
} | ConvertTo-Json

try {
    $resendResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/resend-otp" -Method Post -Body $resendBody -ContentType "application/json"
    Write-Host "Resend Response (Attempt 1):" -ForegroundColor Green
    $resendResponse | ConvertTo-Json -Depth 10
    Write-Host "Resend Count: $($resendResponse.data.resendCount)" -ForegroundColor Cyan
    Write-Host "Remaining Attempts: $($resendResponse.data.remainingAttempts)" -ForegroundColor Cyan
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Case 2: Resend OTP (Second attempt)
Write-Host "`n3. Testing OTP resend (Second attempt)..." -ForegroundColor Yellow
try {
    $resendResponse2 = Invoke-RestMethod -Uri "$baseUrl/api/auth/resend-otp" -Method Post -Body $resendBody -ContentType "application/json"
    Write-Host "Resend Response (Attempt 2):" -ForegroundColor Green
    $resendResponse2 | ConvertTo-Json -Depth 10
    Write-Host "Resend Count: $($resendResponse2.data.resendCount)" -ForegroundColor Cyan
    Write-Host "Remaining Attempts: $($resendResponse2.data.remainingAttempts)" -ForegroundColor Cyan
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Case 3: Resend OTP (Third attempt)
Write-Host "`n4. Testing OTP resend (Third attempt)..." -ForegroundColor Yellow
try {
    $resendResponse3 = Invoke-RestMethod -Uri "$baseUrl/api/auth/resend-otp" -Method Post -Body $resendBody -ContentType "application/json"
    Write-Host "Resend Response (Attempt 3):" -ForegroundColor Green
    $resendResponse3 | ConvertTo-Json -Depth 10
    Write-Host "Resend Count: $($resendResponse3.data.resendCount)" -ForegroundColor Cyan
    Write-Host "Remaining Attempts: $($resendResponse3.data.remainingAttempts)" -ForegroundColor Cyan
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test Case 4: Resend OTP (Fourth attempt - should fail with 429)
Write-Host "`n5. Testing OTP resend (Fourth attempt - should fail with 429)..." -ForegroundColor Yellow
try {
    $resendResponse4 = Invoke-RestMethod -Uri "$baseUrl/api/auth/resend-otp" -Method Post -Body $resendBody -ContentType "application/json"
    Write-Host "ERROR: Should have received 429 status!" -ForegroundColor Red
    $resendResponse4 | ConvertTo-Json -Depth 10
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 429) {
        Write-Host "✓ Correctly received 429 Too Many Requests" -ForegroundColor Green
        Write-Host "Error Message: $($_.ErrorDetails.Message)" -ForegroundColor Cyan
    } else {
        Write-Host "Error (Status $statusCode): $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test Case 5: Test with missing fields
Write-Host "`n6. Testing with missing email..." -ForegroundColor Yellow
$invalidBody = @{
    purpose = "registration"
} | ConvertTo-Json

try {
    $invalidResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/resend-otp" -Method Post -Body $invalidBody -ContentType "application/json"
    Write-Host "ERROR: Should have received 400 status!" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        Write-Host "✓ Correctly received 400 Bad Request" -ForegroundColor Green
        Write-Host "Error Message: $($_.ErrorDetails.Message)" -ForegroundColor Cyan
    } else {
        Write-Host "Error (Status $statusCode): $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test Case 6: Test with invalid purpose
Write-Host "`n7. Testing with invalid purpose..." -ForegroundColor Yellow
$invalidPurposeBody = @{
    email = $testEmail
    purpose = "invalid_purpose"
} | ConvertTo-Json

try {
    $invalidResponse2 = Invoke-RestMethod -Uri "$baseUrl/api/auth/resend-otp" -Method Post -Body $invalidPurposeBody -ContentType "application/json"
    Write-Host "ERROR: Should have received 400 status!" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        Write-Host "✓ Correctly received 400 Bad Request" -ForegroundColor Green
        Write-Host "Error Message: $($_.ErrorDetails.Message)" -ForegroundColor Cyan
    } else {
        Write-Host "Error (Status $statusCode): $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test Case 7: Test with non-existent user
Write-Host "`n8. Testing with non-existent user..." -ForegroundColor Yellow
$nonExistentBody = @{
    email = "nonexistent-$(Get-Random)@example.com"
    purpose = "registration"
} | ConvertTo-Json

try {
    $nonExistentResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/resend-otp" -Method Post -Body $nonExistentBody -ContentType "application/json"
    Write-Host "ERROR: Should have received 404 status!" -ForegroundColor Red
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 404) {
        Write-Host "✓ Correctly received 404 Not Found" -ForegroundColor Green
        Write-Host "Error Message: $($_.ErrorDetails.Message)" -ForegroundColor Cyan
    } else {
        Write-Host "Error (Status $statusCode): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
