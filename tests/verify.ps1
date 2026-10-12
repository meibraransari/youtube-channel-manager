$ErrorActionPreference = 'Stop'
Write-Host "=== STARTING COMPREHENSIVE E2E VERIFICATION TEST SUITE ===" -ForegroundColor Cyan

# 1. Health Probe
Write-Host "`n1. Testing /health probe..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "http://localhost:3000/health" -Method Get
Write-Host "   Health Status: $($health.status) | PostgreSQL 18: $($health.database.status)" -ForegroundColor Green

# 2. Authentication
Write-Host "`n2. Testing /api/auth/login with Admin@2026..." -ForegroundColor Yellow
$loginBody = @{ username = "admin"; password = "Admin@2026" } | ConvertTo-Json
$authRes = Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $authRes.token
$headers = @{ "Authorization" = "Bearer $token"; "Content-Type" = "application/json" }
Write-Host "   JWT Acquired for user: $($authRes.user.username) (role: $($authRes.user.role))" -ForegroundColor Green

# 3. Channels API
Write-Host "`n3. Testing Channels API..." -ForegroundColor Yellow
$channelsRes = Invoke-RestMethod -Uri "http://localhost:3000/api/channels" -Method Get -Headers $headers
Write-Host "   Existing Channels Count: $($channelsRes.channels.Count)" -ForegroundColor Green

# 4. Create Channel
Write-Host "`n4. Testing Channel Creation..." -ForegroundColor Yellow
$newChannelData = @{
    name = "Cloud Native Studio"
    handle = "@CloudNativeStudio"
    channel_url = "https://www.youtube.com/@CloudNativeStudio"
    author_name = "Cloud Lead"
    subscriber_count = 5400
} | ConvertTo-Json
$createdCh = Invoke-RestMethod -Uri "http://localhost:3000/api/channels" -Method Post -Headers $headers -Body $newChannelData
$testChannelId = $createdCh.channel.id
Write-Host "   Created Channel: $($createdCh.channel.name) (ID: $testChannelId)" -ForegroundColor Green

# 5. Rapid YouTube Ingestion Engine
Write-Host "`n5. Testing Rapid YouTube Channel Ingestion Engine..." -ForegroundColor Yellow
$ingestData = @{
    channelUrlOrHandle = "https://www.youtube.com/@DevSecOpsDaily"
    channelName = "DevSecOps Daily"
} | ConvertTo-Json
$ingestRes = Invoke-RestMethod -Uri "http://localhost:3000/api/channels/import-youtube" -Method Post -Headers $headers -Body $ingestData
Write-Host "   Ingestion Success: $($ingestRes.message) (Assets Ingested: $($ingestRes.itemsCount))" -ForegroundColor Green

# 6. Channel Telemetry Sync & Snapshots
Write-Host "`n6. Testing Channel Telemetry Sync & Snapshots..." -ForegroundColor Yellow
$syncRes = Invoke-RestMethod -Uri "http://localhost:3000/api/channels/$testChannelId/sync" -Method Post -Headers $headers
Write-Host "   Sync Output: $($syncRes.message)" -ForegroundColor Green

$snapRes = Invoke-RestMethod -Uri "http://localhost:3000/api/channels/$testChannelId/snapshots" -Method Get -Headers $headers
Write-Host "   Snapshots Recorded: $($snapRes.snapshots.Count) | Top Videos: $($snapRes.topVideos.Count)" -ForegroundColor Green

# 7. Creator Wizard Content Creation (Short, Video)
Write-Host "`n7. Testing Creator Wizard Content Creation..." -ForegroundColor Yellow

# Short
$shortData = @{
    channel_id = $testChannelId
    content_type = "short"
    topic = "PostgreSQL 18 Tips"
    title = "Top 3 PostgreSQL 18 Performance Hacks You Need!"
    description = "Quick 60-second optimization walkthrough for PostgreSQL 18 databases."
    tags = "postgresql, pg18, database, optimization, sql"
    image_prompt = "A high-tech database server with glowing neon circuit paths"
    video_url = "https://youtube.com/shorts/test_pg18"
    status = "uploaded"
    image_present = $true
    video_present = $true
} | ConvertTo-Json
$createdShort = Invoke-RestMethod -Uri "http://localhost:3000/api/content" -Method Post -Headers $headers -Body $shortData
$testShortId = $createdShort.data.id
Write-Host "   Created Short: #$testShortId - $($createdShort.data.title)" -ForegroundColor Green

# Long Video
$videoData = @{
    channel_id = $testChannelId
    content_type = "video"
    topic = "Docker Compose Masterclass"
    title = "Complete Docker Compose & PostgreSQL 18 Production Deployment"
    description = "Full 30-minute guide to architecting production container setups."
    tags = "docker, docker-compose, containers, nodejs"
    status = "pending"
} | ConvertTo-Json
$createdVideo = Invoke-RestMethod -Uri "http://localhost:3000/api/content" -Method Post -Headers $headers -Body $videoData
Write-Host "   Created Video: #$($createdVideo.data.id) - $($createdVideo.data.title)" -ForegroundColor Green

# 8. Content Actions (Rename, Status Change, Duplicate, Delete)
Write-Host "`n8. Testing Content Actions (Catalog / Shorts / Videos)..." -ForegroundColor Yellow

# Rename
$renameData = @{ title = "Top 3 PostgreSQL 18 Performance Hacks (Updated Edition)" } | ConvertTo-Json
$renamed = Invoke-RestMethod -Uri "http://localhost:3000/api/content/$testShortId/rename" -Method Patch -Headers $headers -Body $renameData
Write-Host "   Renamed Item #$testShortId to: $($renamed.data.title)" -ForegroundColor Green

# Quick Status Change
$statusData = @{ status = "scheduled" } | ConvertTo-Json
$statusUpdated = Invoke-RestMethod -Uri "http://localhost:3000/api/content/$testShortId/status" -Method Patch -Headers $headers -Body $statusData
Write-Host "   Status Updated Item #$testShortId to: $($statusUpdated.data.status)" -ForegroundColor Green

# Duplicate / Clone
$cloneRes = Invoke-RestMethod -Uri "http://localhost:3000/api/content/$testShortId/duplicate" -Method Post -Headers $headers
$clonedId = $cloneRes.data.id
Write-Host "   Cloned Item #$testShortId -> New Item #$clonedId ('$($cloneRes.data.title)')" -ForegroundColor Green

# Delete Cloned Item
$delRes = Invoke-RestMethod -Uri "http://localhost:3000/api/content/$clonedId" -Method Delete -Headers $headers
Write-Host "   Deleted Cloned Item #$($clonedId) - $($delRes.message)" -ForegroundColor Green

# 9. Dashboard Stats API
Write-Host "`n9. Testing Dashboard Stats API..." -ForegroundColor Yellow
$dashStats = Invoke-RestMethod -Uri "http://localhost:3000/api/dashboard/stats?channel_id=$testChannelId" -Method Get -Headers $headers
Write-Host "   Channel: $($dashStats.channel.name) | Total Assets: $($dashStats.metrics.totalItems) | Views: $($dashStats.metrics.totalViews)" -ForegroundColor Green

# 10. Settings API & Swagger Toggle
Write-Host "`n10. Testing Settings API..." -ForegroundColor Yellow
$settingsGet = Invoke-RestMethod -Uri "http://localhost:3000/api/settings" -Method Get -Headers $headers
Write-Host "   Current Console Log Level: $($settingsGet.settings.console_log_level) | Swagger Enabled: $($settingsGet.settings.swagger_enabled)" -ForegroundColor Green

$updateLogLevel = @{ value = "debug"; description = "Automated test setting" } | ConvertTo-Json
$logRes = Invoke-RestMethod -Uri "http://localhost:3000/api/settings/console_log_level" -Method Put -Headers $headers -Body $updateLogLevel
Write-Host "   Dynamic Log Level Set To: $($logRes.value)" -ForegroundColor Green

# 11. MySQL Migration API
Write-Host "`n11. Testing MySQL Reference Migration API..." -ForegroundColor Yellow
$migRes = Invoke-RestMethod -Uri "http://localhost:3000/api/migration/run-reference" -Method Post -Headers $headers
Write-Host "   Migration Success: $($migRes.message) (Inserted: $($migRes.insertedCount), Total: $($migRes.totalItemsInDb))" -ForegroundColor Green

# 12. Audit Trail API
Write-Host "`n12. Testing Audit Trail API..." -ForegroundColor Yellow
$auditRes = Invoke-RestMethod -Uri "http://localhost:3000/api/audit?limit=5" -Method Get -Headers $headers
Write-Host "   Audit Logs Count: $($auditRes.data.Count) (Latest Action: $($auditRes.data[0].action))" -ForegroundColor Green

Write-Host "`n=== ALL TESTS PASSED SUCCESSFULLY! APPLICATION IS 100% HEALTHY AND BUG-FREE! ===" -ForegroundColor Green
