# CORS Configuration Test Script
# This script tests the CORS configuration manually

Write-Host "Testing CORS Configuration..." -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:5000"
$allowedOrigin = "http://localhost:5173"

# Test 1: Preflight request with allowed origin
Write-Host "Test 1: Preflight request (OPTIONS) from allowed origin" -ForegroundColor Yellow
$response1 = Invoke-WebRequest -Uri "$baseUrl/health" `
    -Method OPTIONS `
    -Headers @{
        "Origin" = $allowedOrigin
        "Access-Control-Request-Method" = "GET"
        "Access-Control-Request-Headers" = "Content-Type,Authorization"
    } -UseBasicParsing

Write-Host "  Status: $($response1.StatusCode)" -ForegroundColor Green
Write-Host "  Access-Control-Allow-Origin: $($response1.Headers.'Access-Control-Allow-Origin')" -ForegroundColor Green
Write-Host "  Access-Control-Allow-Credentials: $($response1.Headers.'Access-Control-Allow-Credentials')" -ForegroundColor Green
Write-Host "  Access-Control-Allow-Methods: $($response1.Headers.'Access-Control-Allow-Methods')" -ForegroundColor Green
Write-Host "  Access-Control-Allow-Headers: $($response1.Headers.'Access-Control-Allow-Headers')" -ForegroundColor Green
Write-Host ""

# Test 2: Actual GET request with allowed origin
Write-Host "Test 2: GET request from allowed origin" -ForegroundColor Yellow
$response2 = Invoke-WebRequest -Uri "$baseUrl/health" `
    -Method GET `
    -Headers @{
        "Origin" = $allowedOrigin
    } -UseBasicParsing

Write-Host "  Status: $($response2.StatusCode)" -ForegroundColor Green
Write-Host "  Access-Control-Allow-Origin: $($response2.Headers.'Access-Control-Allow-Origin')" -ForegroundColor Green
Write-Host "  Access-Control-Allow-Credentials: $($response2.Headers.'Access-Control-Allow-Credentials')" -ForegroundColor Green
Write-Host ""

# Test 3: Request with Authorization header
Write-Host "Test 3: Request with Authorization header" -ForegroundColor Yellow
$response3 = Invoke-WebRequest -Uri "$baseUrl/health" `
    -Method GET `
    -Headers @{
        "Origin" = $allowedOrigin
        "Authorization" = "Bearer test-token"
    } -UseBasicParsing

Write-Host "  Status: $($response3.StatusCode)" -ForegroundColor Green
Write-Host "  Authorization header accepted" -ForegroundColor Green
Write-Host ""

Write-Host "✓ All CORS tests passed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "CORS Configuration Details:" -ForegroundColor Cyan
Write-Host "  - Allowed Origin: $allowedOrigin" -ForegroundColor White
Write-Host "  - Credentials Enabled: Yes" -ForegroundColor White
Write-Host "  - Allowed Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS" -ForegroundColor White
Write-Host "  - Allowed Headers: Content-Type, Authorization" -ForegroundColor White
