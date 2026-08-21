# Test Registration Endpoint

Write-Host "Testing POST /api/auth/register endpoint..." -ForegroundColor Cyan

# Test 1: Register Organizer (should be pending)
Write-Host "`n[TEST 1] Register as Organizer:" -ForegroundColor Yellow
$body1 = @{
    email = "organizer@test.com"
    password = "password123"
    fullName = "Test Organizer"
    role = "organizer"
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
        -Method POST `
        -Body $body1 `
        -ContentType "application/json"
    Write-Host "SUCCESS: $($response1.message)" -ForegroundColor Green
    Write-Host "User Status: $($response1.user.status)" -ForegroundColor Green
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Register Exhibitor (should send OTP)
Write-Host "`n[TEST 2] Register as Exhibitor:" -ForegroundColor Yellow
$body2 = @{
    email = "exhibitor@test.com"
    password = "password123"
    fullName = "Test Exhibitor"
    role = "exhibitor"
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
        -Method POST `
        -Body $body2 `
        -ContentType "application/json"
    Write-Host "SUCCESS: $($response2.message)" -ForegroundColor Green
    Write-Host "User Status: $($response2.user.status)" -ForegroundColor Green
    Write-Host "Email Verified: $($response2.user.isEmailVerified)" -ForegroundColor Green
} catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Try to register SuperAdmin (should fail with 403)
Write-Host "`n[TEST 3] Try to register as SuperAdmin (should fail):" -ForegroundColor Yellow
$body3 = @{
    email = "superadmin@test.com"
    password = "password123"
    fullName = "Test SuperAdmin"
    role = "superadmin"
} | ConvertTo-Json

try {
    $response3 = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
        -Method POST `
        -Body $body3 `
        -ContentType "application/json"
    Write-Host "UNEXPECTED: Registration succeeded (should have failed)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Host "SUCCESS: Registration blocked (403)" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Wrong status code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}

# Test 4: Try to register with duplicate email (should fail with 409)
Write-Host "`n[TEST 4] Try to register with duplicate email (should fail):" -ForegroundColor Yellow
$body4 = @{
    email = "organizer@test.com"
    password = "password123"
    fullName = "Another Organizer"
    role = "organizer"
} | ConvertTo-Json

try {
    $response4 = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
        -Method POST `
        -Body $body4 `
        -ContentType "application/json"
    Write-Host "UNEXPECTED: Registration succeeded (should have failed)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 409) {
        Write-Host "SUCCESS: Duplicate email blocked (409)" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Wrong status code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}

# Test 5: Try to register with short password (should fail with 400)
Write-Host "`n[TEST 5] Try to register with short password (should fail):" -ForegroundColor Yellow
$body5 = @{
    email = "short@test.com"
    password = "pass"
    fullName = "Short Password"
    role = "attendee"
} | ConvertTo-Json

try {
    $response5 = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/register" `
        -Method POST `
        -Body $body5 `
        -ContentType "application/json"
    Write-Host "UNEXPECTED: Registration succeeded (should have failed)" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 400) {
        Write-Host "SUCCESS: Short password blocked (400)" -ForegroundColor Green
    } else {
        Write-Host "ERROR: Wrong status code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    }
}

Write-Host "`nAll tests completed!" -ForegroundColor Cyan
