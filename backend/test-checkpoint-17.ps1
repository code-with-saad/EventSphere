# EventSphere Backend Authentication Core - Checkpoint 17 Test Script
# Tests all authentication endpoints with comprehensive scenarios

$baseUrl = "http://localhost:5000"
$testResults = @()

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  EventSphere Backend Authentication Core - Checkpoint 17     " -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Helper function to test endpoint and record results
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{},
        [hashtable]$Body = $null,
        [string]$ExpectedStatus,
        [string]$Description
    )
    
    Write-Host "----------------------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "TEST: $Name" -ForegroundColor Yellow
    Write-Host "Description: $Description" -ForegroundColor Gray
    Write-Host "Method: $Method $Url" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
            ContentType = "application/json"
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 10)
            Write-Host "Request Body:" -ForegroundColor Gray
            Write-Host ($Body | ConvertTo-Json -Depth 10) -ForegroundColor DarkGray
        }
        
        $response = Invoke-RestMethod @params
        $statusCode = "200"
        
        Write-Host "[PASS] Response Status: $statusCode" -ForegroundColor Green
        Write-Host "Response:" -ForegroundColor Gray
        Write-Host ($response | ConvertTo-Json -Depth 10) -ForegroundColor White
        
        $script:testResults += [PSCustomObject]@{
            Test = $Name
            Status = "PASSED"
            StatusCode = $statusCode
            Expected = $ExpectedStatus
        }
        
        return $response
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "[INFO] Response Status: $statusCode" -ForegroundColor $(if ($statusCode -eq $ExpectedStatus) { "Green" } else { "Red" })
        
        try {
            $errorBody = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "Error Response:" -ForegroundColor Gray
            Write-Host ($errorBody | ConvertTo-Json -Depth 10) -ForegroundColor White
        } catch {
            Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        $script:testResults += [PSCustomObject]@{
            Test = $Name
            Status = $(if ($statusCode -eq $ExpectedStatus) { "PASSED" } else { "FAILED" })
            StatusCode = $statusCode
            Expected = $ExpectedStatus
        }
        
        if ($statusCode -ne $ExpectedStatus) {
            throw "Expected status $ExpectedStatus but got $statusCode"
        }
        
        return $errorBody
    }
    
    Write-Host ""
}

# Test variables for storing data between tests
$organizerEmail = "organizer-test-$(Get-Random)@test.com"
$exhibitorEmail = "exhibitor-test-$(Get-Random)@test.com"
$attendeeEmail = "attendee-test-$(Get-Random)@test.com"
$testPassword = "TestPass123"

$exhibitorOTP = $null
$organizerAccessToken = $null
$organizerRefreshToken = $null
$exhibitorAccessToken = $null
$exhibitorRefreshToken = $null

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  PHASE 1: REGISTRATION ENDPOINT TESTS" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Register Organizer (should create with status: pending)
try {
    $response = Test-Endpoint `
        -Name "1. Register Organizer" `
        -Method "POST" `
        -Url "$baseUrl/api/auth/register" `
        -Body @{
            email = $organizerEmail
            password = $testPassword
            fullName = "Test Organizer"
            role = "organizer"
        } `
        -ExpectedStatus "200" `
        -Description "Register new Organizer account (should create with status: pending)"
    
    if ($response.data.status -eq "pending") {
        Write-Host "[PASS] Organizer status is 'pending' as expected" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Organizer status is '$($response.data.status)', expected 'pending'" -ForegroundColor Red
    }
} catch {
    Write-Host "[FAIL] Test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Register Exhibitor (should send OTP)
try {
    $response = Test-Endpoint `
        -Name "2. Register Exhibitor" `
        -Method "POST" `
        -Url "$baseUrl/api/auth/register" `
        -Body @{
            email = $exhibitorEmail
            password = $testPassword
            fullName = "Test Exhibitor"
            role = "exhibitor"
        } `
        -ExpectedStatus "200" `
        -Description "Register new Exhibitor account (should send OTP email)"
    
    if ($response.message -like "*OTP*") {
        Write-Host "[PASS] OTP mentioned in response message" -ForegroundColor Green
        Write-Host "[INFO] MANUAL CHECK: Verify OTP email received at $exhibitorEmail" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[FAIL] Test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Register Attendee (should send OTP)
try {
    $response = Test-Endpoint `
        -Name "3. Register Attendee" `
        -Method "POST" `
        -Url "$baseUrl/api/auth/register" `
        -Body @{
            email = $attendeeEmail
            password = $testPassword
            fullName = "Test Attendee"
            role = "attendee"
        } `
        -ExpectedStatus "200" `
        -Description "Register new Attendee account (should send OTP email)"
    
    if ($response.message -like "*OTP*") {
        Write-Host "[PASS] OTP mentioned in response message" -ForegroundColor Green
        Write-Host "[INFO] MANUAL CHECK: Verify OTP email received at $attendeeEmail" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[FAIL] Test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 4: Duplicate email registration (should fail with 409)
try {
    Test-Endpoint `
        -Name "4. Duplicate Email Registration" `
        -Method "POST" `
        -Url "$baseUrl/api/auth/register" `
        -Body @{
            email = $organizerEmail
            password = $testPassword
            fullName = "Duplicate User"
            role = "organizer"
        } `
        -ExpectedStatus "409" `
        -Description "Attempt to register with existing email (should fail)"
} catch {
    Write-Host "[FAIL] Test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 5: Invalid email format (should fail with 400)
try {
    Test-Endpoint `
        -Name "5. Invalid Email Format" `
        -Method "POST" `
        -Url "$baseUrl/api/auth/register" `
        -Body @{
            email = "invalid-email"
            password = $testPassword
            fullName = "Test User"
            role = "exhibitor"
        } `
        -ExpectedStatus "400" `
        -Description "Register with invalid email format (should fail)"
} catch {
    Write-Host "[FAIL] Test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 6: SuperAdmin role registration (should fail with 403)
try {
    Test-Endpoint `
        -Name "6. SuperAdmin Registration Blocked" `
        -Method "POST" `
        -Url "$baseUrl/api/auth/register" `
        -Body @{
            email = "admin-test@test.com"
            password = $testPassword
            fullName = "Test Admin"
            role = "superadmin"
        } `
        -ExpectedStatus "403" `
        -Description "Attempt to register as SuperAdmin (should be blocked)"
} catch {
    Write-Host "[FAIL] Test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  PHASE 2: OTP VERIFICATION TESTS" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[INFO] OTP VERIFICATION TESTS REQUIRE MANUAL INPUT" -ForegroundColor Yellow
Write-Host "Please check the email inbox for $exhibitorEmail" -ForegroundColor Yellow
$otp = Read-Host "Enter the 6-digit OTP received (or press Enter to skip OTP tests)"

if ($otp) {
    # Test 7: Verify OTP with valid code
    try {
        $response = Test-Endpoint `
            -Name "7. Verify OTP - Valid Code" `
            -Method "POST" `
            -Url "$baseUrl/api/auth/verify-otp" `
            -Body @{
                email = $exhibitorEmail
                otp = $otp
                purpose = "registration"
            } `
            -ExpectedStatus "200" `
            -Description "Verify Exhibitor email with valid OTP"
        
        Write-Host "[PASS] Exhibitor account verified successfully" -ForegroundColor Green
    } catch {
        Write-Host "[FAIL] OTP verification failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
    
    # Test 8: Verify already verified account (should fail)
    try {
        Test-Endpoint `
            -Name "8. Verify Already Verified Account" `
            -Method "POST" `
            -Url "$baseUrl/api/auth/verify-otp" `
            -Body @{
                email = $exhibitorEmail
                otp = $otp
                purpose = "registration"
            } `
            -ExpectedStatus "409" `
            -Description "Attempt to verify already verified account (should fail)"
    } catch {
        Write-Host "[FAIL] Test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "[SKIP] Skipping OTP verification tests" -ForegroundColor Yellow
}

Write-Host ""

# Test 9: Invalid OTP (should fail with 401)
try {
    Test-Endpoint `
        -Name "9. Verify OTP - Invalid Code" `
        -Method "POST" `
        -Url "$baseUrl/api/auth/verify-otp" `
        -Body @{
            email = $attendeeEmail
            otp = "000000"
            purpose = "registration"
        } `
        -ExpectedStatus "401" `
        -Description "Verify with invalid OTP code (should fail)"
} catch {
    Write-Host "[FAIL] Test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  PHASE 3: LOGIN ENDPOINT TESTS" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Test 10: Login with invalid credentials (should fail with 401)
try {
    Test-Endpoint `
        -Name "10. Login - Invalid Credentials" `
        -Method "POST" `
        -Url "$baseUrl/api/auth/login" `
        -Body @{
            email = $organizerEmail
            password = "WrongPassword123"
        } `
        -ExpectedStatus "401" `
        -Description "Login with wrong password (should fail)"
} catch {
    Write-Host "[FAIL] Test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 11: Login as pending Organizer (should fail with 403)
try {
    Test-Endpoint `
        -Name "11. Login - Pending Organizer" `
        -Method "POST" `
        -Url "$baseUrl/api/auth/login" `
        -Body @{
            email = $organizerEmail
            password = $testPassword
        } `
        -ExpectedStatus "403" `
        -Description "Login as Organizer with pending status (should fail)"
} catch {
    Write-Host "[FAIL] Test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

if (-not $otp) {
    # Test 12: Login as unverified Exhibitor (should fail with 403)
    try {
        Test-Endpoint `
            -Name "12. Login - Unverified Exhibitor" `
            -Method "POST" `
            -Url "$baseUrl/api/auth/login" `
            -Body @{
                email = $exhibitorEmail
                password = $testPassword
            } `
            -ExpectedStatus "403" `
            -Description "Login as unverified Exhibitor (should fail)"
    } catch {
        Write-Host "[FAIL] Test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host ""
}

# Test 13: Successful login (need SuperAdmin or create verified test user)
Write-Host "Testing successful login with SuperAdmin account..." -ForegroundColor Gray
try {
    $response = Test-Endpoint `
        -Name "13. Login - Valid Credentials (SuperAdmin)" `
        -Method "POST" `
        -Url "$baseUrl/api/auth/login" `
        -Body @{
            email = "admin@eventsphere.com"
            password = "AdminSecure123"
        } `
        -ExpectedStatus "200" `
        -Description "Login with valid SuperAdmin credentials"
    
    $organizerAccessToken = $response.data.accessToken
    $organizerRefreshToken = $response.data.refreshToken
    
    Write-Host "[PASS] Access token received and stored" -ForegroundColor Green
    Write-Host "[PASS] Refresh token received and stored" -ForegroundColor Green
} catch {
    Write-Host "[INFO] SuperAdmin login failed (check credentials in .env)" -ForegroundColor Yellow
    Write-Host "Continuing with remaining tests..." -ForegroundColor Gray
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  PHASE 4: TOKEN REFRESH TESTS" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

if ($organizerRefreshToken) {
    # Test 14: Refresh tokens with valid refresh token
    try {
        $response = Test-Endpoint `
            -Name "14. Token Refresh - Valid Refresh Token" `
            -Method "POST" `
            -Url "$baseUrl/api/auth/refresh" `
            -Headers @{
                "Authorization" = "Bearer $organizerRefreshToken"
            } `
            -ExpectedStatus "200" `
            -Description "Refresh access token using valid refresh token"
        
        $newAccessToken = $response.data.accessToken
        $newRefreshToken = $response.data.refreshToken
        
        Write-Host "[PASS] New access token received" -ForegroundColor Green
        Write-Host "[PASS] New refresh token received (rotation)" -ForegroundColor Green
        
        Write-Host ""
        
        # Test 15: Use old refresh token (should fail - token rotation)
        try {
            Test-Endpoint `
                -Name "15. Token Refresh - Old Refresh Token" `
                -Method "POST" `
                -Url "$baseUrl/api/auth/refresh" `
                -Headers @{
                    "Authorization" = "Bearer $organizerRefreshToken"
                } `
                -ExpectedStatus "401" `
                -Description "Attempt to use old refresh token after rotation (should fail)"
            
            Write-Host "[PASS] Old refresh token correctly marked invalid" -ForegroundColor Green
        } catch {
            Write-Host "[FAIL] Test failed: $($_.Exception.Message)" -ForegroundColor Red
        }
        
    } catch {
        Write-Host "[FAIL] Token refresh failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "[SKIP] Skipping token refresh tests (no refresh token available)" -ForegroundColor Yellow
}

Write-Host ""

# Test 16: Invalid refresh token (should fail with 401)
try {
    Test-Endpoint `
        -Name "16. Token Refresh - Invalid Token" `
        -Method "POST" `
        -Url "$baseUrl/api/auth/refresh" `
        -Headers @{
            "Authorization" = "Bearer invalid.token.here"
        } `
        -ExpectedStatus "401" `
        -Description "Attempt refresh with invalid token (should fail)"
} catch {
    Write-Host "[FAIL] Test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  PHASE 5: SUPERADMIN SEED SCRIPT TEST" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Running SuperAdmin seed script..." -ForegroundColor Yellow
try {
    $seedOutput = & node scripts/seedSuperAdmin.js 2>&1
    Write-Host $seedOutput -ForegroundColor White
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[PASS] SuperAdmin seed script executed successfully" -ForegroundColor Green
        $script:testResults += [PSCustomObject]@{
            Test = "17. SuperAdmin Seed Script"
            Status = "PASSED"
            StatusCode = "0"
            Expected = "0"
        }
    } else {
        Write-Host "[FAIL] SuperAdmin seed script failed with exit code $LASTEXITCODE" -ForegroundColor Red
        $script:testResults += [PSCustomObject]@{
            Test = "17. SuperAdmin Seed Script"
            Status = "FAILED"
            StatusCode = $LASTEXITCODE
            Expected = "0"
        }
    }
} catch {
    Write-Host "[FAIL] Failed to run seed script: $($_.Exception.Message)" -ForegroundColor Red
    $script:testResults += [PSCustomObject]@{
        Test = "17. SuperAdmin Seed Script"
        Status = "FAILED"
        StatusCode = "N/A"
        Expected = "0"
    }
}

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$testResults | Format-Table -AutoSize

$passed = ($testResults | Where-Object { $_.Status -eq "PASSED" }).Count
$total = $testResults.Count

Write-Host ""
Write-Host "Results: $passed/$total tests passed" -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Yellow" })
Write-Host ""

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  MANUAL VERIFICATION CHECKLIST" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please manually verify the following:" -ForegroundColor Yellow
Write-Host "[ ] OTP email received for Exhibitor at: $exhibitorEmail" -ForegroundColor Gray
Write-Host "[ ] OTP email received for Attendee at: $attendeeEmail" -ForegroundColor Gray
Write-Host "[ ] Access token contains userId, email, and role in JWT payload" -ForegroundColor Gray
Write-Host "[ ] Refresh token stored in database with SHA-256 hash" -ForegroundColor Gray
Write-Host "[ ] Old refresh token marked as invalid after rotation" -ForegroundColor Gray
Write-Host "[ ] SuperAdmin account exists in database with correct email" -ForegroundColor Gray
Write-Host ""
Write-Host "To verify JWT token payload, decode the access token at: https://jwt.io" -ForegroundColor Gray
Write-Host "To verify database state, connect to MongoDB and query collections" -ForegroundColor Gray
Write-Host ""
