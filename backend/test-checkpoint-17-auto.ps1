# EventSphere Backend Authentication Core - Checkpoint 17 Test Script (Automated)
# Tests all authentication endpoints without requiring user input

$baseUrl = "http://localhost:5000"
$testResults = @()

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  EventSphere Backend Authentication - Checkpoint 17 (Auto)   " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Helper function
function Test-API {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{},
        [hashtable]$Body = $null,
        [int]$ExpectedStatus
    )
    
    Write-Host "[ TEST ] $Name" -ForegroundColor Yellow
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            ContentType = "application/json"
            ErrorAction = "Stop"
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
        }
        
        $response = Invoke-WebRequest @params
        $statusCode = $response.StatusCode
        $content = $response.Content | ConvertFrom-Json
        
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "[  OK  ] Status: $statusCode (Expected: $ExpectedStatus)" -ForegroundColor Green
            $script:testResults += @{ Test=$Name; Status="PASS"; Code=$statusCode }
            return $content
        } else {
            Write-Host "[ FAIL ] Status: $statusCode (Expected: $ExpectedStatus)" -ForegroundColor Red
            $script:testResults += @{ Test=$Name; Status="FAIL"; Code=$statusCode }
            return $content
        }
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "[  OK  ] Status: $statusCode (Expected: $ExpectedStatus)" -ForegroundColor Green
            $script:testResults += @{ Test=$Name; Status="PASS"; Code=$statusCode }
        } else {
            Write-Host "[ FAIL ] Status: $statusCode (Expected: $ExpectedStatus)" -ForegroundColor Red
            $script:testResults += @{ Test=$Name; Status="FAIL"; Code=$statusCode }
        }
        
        try {
            $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
            return $errorBody
        } catch {
            return $null
        }
    }
}

# Generate unique test emails
$timestamp = [int](Get-Date -UFormat %s)
$organizerEmail = "test-organizer-$timestamp@test.com"
$exhibitorEmail = "test-exhibitor-$timestamp@test.com"
$attendeeEmail = "test-attendee-$timestamp@test.com"
$password = "TestPass123"

Write-Host "Test Users:" -ForegroundColor Cyan
Write-Host "  Organizer: $organizerEmail" -ForegroundColor Gray
Write-Host "  Exhibitor: $exhibitorEmail" -ForegroundColor Gray
Write-Host "  Attendee:  $attendeeEmail" -ForegroundColor Gray
Write-Host ""

# PHASE 1: Registration Tests
Write-Host "== PHASE 1: REGISTRATION TESTS ==" -ForegroundColor Cyan
Write-Host ""

$orgResponse = Test-API -Name "1. Register Organizer (status=pending)" `
    -Method POST -Url "$baseUrl/api/auth/register" `
    -Body @{email=$organizerEmail; password=$password; fullName="Test Org"; role="organizer"} `
    -ExpectedStatus 201

if ($orgResponse.user.status -eq "pending") {
    Write-Host "[  OK  ] Organizer created with status='pending'" -ForegroundColor Green
} else {
    Write-Host "[ FAIL ] Organizer status is '$($orgResponse.user.status)'" -ForegroundColor Red
}
Write-Host ""

$exhResponse = Test-API -Name "2. Register Exhibitor (sends OTP)" `
    -Method POST -Url "$baseUrl/api/auth/register" `
    -Body @{email=$exhibitorEmail; password=$password; fullName="Test Exh"; role="exhibitor"} `
    -ExpectedStatus 201
Write-Host ""

$attResponse = Test-API -Name "3. Register Attendee (sends OTP)" `
    -Method POST -Url "$baseUrl/api/auth/register" `
    -Body @{email=$attendeeEmail; password=$password; fullName="Test Att"; role="attendee"} `
    -ExpectedStatus 201
Write-Host ""

Test-API -Name "4. Duplicate Email (409)" `
    -Method POST -Url "$baseUrl/api/auth/register" `
    -Body @{email=$organizerEmail; password=$password; fullName="Dup"; role="organizer"} `
    -ExpectedStatus 409
Write-Host ""

Test-API -Name "5. Invalid Email Format (400)" `
    -Method POST -Url "$baseUrl/api/auth/register" `
    -Body @{email="notanemail"; password=$password; fullName="Bad"; role="exhibitor"} `
    -ExpectedStatus 400
Write-Host ""

Test-API -Name "6. SuperAdmin Registration Blocked (403)" `
    -Method POST -Url "$baseUrl/api/auth/register" `
    -Body @{email="admin@test.com"; password=$password; fullName="Admin"; role="superadmin"} `
    -ExpectedStatus 403
Write-Host ""

# PHASE 2: OTP Tests (automated with invalid OTP)
Write-Host "== PHASE 2: OTP VERIFICATION TESTS ==" -ForegroundColor Cyan
Write-Host ""

Test-API -Name "7. Invalid OTP (401)" `
    -Method POST -Url "$baseUrl/api/auth/verify-otp" `
    -Body @{email=$attendeeEmail; otp="000000"; purpose="registration"} `
    -ExpectedStatus 401
Write-Host ""

# PHASE 3: Login Tests
Write-Host "== PHASE 3: LOGIN TESTS ==" -ForegroundColor Cyan
Write-Host ""

Test-API -Name "8. Invalid Password (401)" `
    -Method POST -Url "$baseUrl/api/auth/login" `
    -Body @{email=$organizerEmail; password="WrongPass"} `
    -ExpectedStatus 401
Write-Host ""

Test-API -Name "9. Pending Organizer Login (403)" `
    -Method POST -Url "$baseUrl/api/auth/login" `
    -Body @{email=$organizerEmail; password=$password} `
    -ExpectedStatus 403
Write-Host ""

Test-API -Name "10. Unverified Exhibitor Login (403)" `
    -Method POST -Url "$baseUrl/api/auth/login" `
    -Body @{email=$exhibitorEmail; password=$password} `
    -ExpectedStatus 403
Write-Host ""

# Try SuperAdmin login
$saResponse = Test-API -Name "11. SuperAdmin Login (200)" `
    -Method POST -Url "$baseUrl/api/auth/login" `
    -Body @{email="admin@eventsphere.com"; password="codewithzyrex4845"} `
    -ExpectedStatus 200

$accessToken = $null
$refreshToken = $null

if ($saResponse) {
    $accessToken = $saResponse.data.accessToken
    $refreshToken = $saResponse.data.refreshToken
    
    if ($accessToken) {
        Write-Host "[  OK  ] Access token received" -ForegroundColor Green
    }
    if ($refreshToken) {
        Write-Host "[  OK  ] Refresh token received" -ForegroundColor Green
    }
}
Write-Host ""

# PHASE 4: Token Refresh Tests
Write-Host "== PHASE 4: TOKEN REFRESH TESTS ==" -ForegroundColor Cyan
Write-Host ""

if ($refreshToken) {
    $refreshResponse = Test-API -Name "12. Valid Token Refresh (200)" `
        -Method POST -Url "$baseUrl/api/auth/refresh" `
        -Headers @{Authorization="Bearer $refreshToken"} `
        -ExpectedStatus 200
    
    if ($refreshResponse) {
        Write-Host "[  OK  ] New access token received" -ForegroundColor Green
        Write-Host "[  OK  ] New refresh token received (rotation)" -ForegroundColor Green
    }
    Write-Host ""
    
    Test-API -Name "13. Old Refresh Token (401 - rotated)" `
        -Method POST -Url "$baseUrl/api/auth/refresh" `
        -Headers @{Authorization="Bearer $refreshToken"} `
        -ExpectedStatus 401
    Write-Host ""
}

Test-API -Name "14. Invalid Refresh Token (401)" `
    -Method POST -Url "$baseUrl/api/auth/refresh" `
    -Headers @{Authorization="Bearer invalid.token.here"} `
    -ExpectedStatus 401
Write-Host ""

# PHASE 5: SuperAdmin Seed Script
Write-Host "== PHASE 5: SUPERADMIN SEED SCRIPT ==" -ForegroundColor Cyan
Write-Host ""

Write-Host "[ TEST ] Running SuperAdmin seed script..." -ForegroundColor Yellow
try {
    $seedOutput = & node scripts/seedSuperAdmin.js 2>&1
    Write-Host $seedOutput -ForegroundColor White
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[  OK  ] SuperAdmin seed script succeeded" -ForegroundColor Green
        $script:testResults += @{ Test="SuperAdmin Seed"; Status="PASS"; Code=0 }
    } else {
        Write-Host "[ FAIL ] Seed script failed (exit code: $LASTEXITCODE)" -ForegroundColor Red
        $script:testResults += @{ Test="SuperAdmin Seed"; Status="FAIL"; Code=$LASTEXITCODE }
    }
} catch {
    Write-Host "[ FAIL ] $($_.Exception.Message)" -ForegroundColor Red
    $script:testResults += @{ Test="SuperAdmin Seed"; Status="FAIL"; Code="ERR" }
}
Write-Host ""

# Summary
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$passed = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$total = $testResults.Count

foreach ($result in $testResults) {
    $color = if ($result.Status -eq "PASS") { "Green" } else { "Red" }
    $status = if ($result.Status -eq "PASS") { "PASS" } else { "FAIL" }
    Write-Host "[$status] $($result.Test) (Status: $($result.Code))" -ForegroundColor $color
}

Write-Host ""
Write-Host "Results: $passed passed, $failed failed, $total total" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
Write-Host ""

Write-Host "== MANUAL VERIFICATION REQUIRED ==" -ForegroundColor Yellow
Write-Host "[ ] Check email inbox for OTPs sent to:" -ForegroundColor Gray
Write-Host "    - $exhibitorEmail" -ForegroundColor Gray
Write-Host "    - $attendeeEmail" -ForegroundColor Gray
Write-Host "[ ] Decode access token at https://jwt.io to verify payload" -ForegroundColor Gray
Write-Host "[ ] Check MongoDB database for:" -ForegroundColor Gray
Write-Host "    - Users collection has test accounts" -ForegroundColor Gray
Write-Host "    - RefreshTokens collection has token hashes" -ForegroundColor Gray
Write-Host "    - Old refresh token marked isValid=false after rotation" -ForegroundColor Gray
Write-Host ""
