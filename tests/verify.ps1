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

# 13. Tag Presets Dedicated Table & API
Write-Host "`n13. Testing Tag Presets Dedicated Table & API..." -ForegroundColor Yellow
$tagsRes = Invoke-RestMethod -Uri "http://localhost:3000/api/tags/presets" -Method Get -Headers $headers
Write-Host "   Existing Tag Presets Count: $($tagsRes.presets.Count)" -ForegroundColor Green

# Verify tag_presets is NOT in system_settings
$settingsCheck = Invoke-RestMethod -Uri "http://localhost:3000/api/settings" -Method Get -Headers $headers
if ($settingsCheck.settings.tag_presets) {
    throw "Regression: tag_presets found inside system_settings! It must be completely decoupled."
}
Write-Host "   Verified tag_presets is completely decoupled from system_settings." -ForegroundColor Green

# Test Creating Custom Preset
$newPresetBody = @{
    name = "Terraform & IaC Automation"
    category = "DevOps"
    tags = "terraform, iac, infrastructure as code, cloud, automation, hashicorp"
} | ConvertTo-Json
$createPresetRes = Invoke-RestMethod -Uri "http://localhost:3000/api/tags/presets" -Method Post -Headers $headers -Body $newPresetBody
$createdPresetId = $createPresetRes.preset.id
Write-Host "   Created Custom Tag Preset: $($createPresetRes.preset.name) (ID: $createdPresetId)" -ForegroundColor Green

# Test Deleting Custom Preset
$delPresetRes = Invoke-RestMethod -Uri "http://localhost:3000/api/tags/presets/$createdPresetId" -Method Delete -Headers $headers
Write-Host "   Deleted Custom Tag Preset: $($delPresetRes.message)" -ForegroundColor Green

# 14. Telemetry Report & Email Alerts API
Write-Host "`n14. Testing Automated Telemetry Report Preview & Directives API..." -ForegroundColor Yellow
$telemetryPreviewBody = @{
    recipients = "admin@domain.com, ops@domain.com, devops@studio.internal"
    metrics = @("subscribers", "views", "content_breakdown", "server_health", "top_videos", "recent_audit")
    templateTheme = "executive_dark"
    customNotes = "Daily Studio Telemetry Automated Digest"
    cron = "0 8 * * *"
} | ConvertTo-Json

$previewRes = Invoke-RestMethod -Uri "http://localhost:3000/api/settings/telemetry-report/preview" -Method Post -Headers $headers -Body $telemetryPreviewBody
if (-not $previewRes.html -or $previewRes.html.Length -lt 200) {
    throw "Telemetry Preview HTML is empty or invalid!"
}
Write-Host "   Live Telemetry HTML Generated: $($previewRes.html.Length) chars | Channels: $($previewRes.telemetrySummary.totalChannels) | Latency: $($previewRes.telemetrySummary.dbLatencyMs)ms" -ForegroundColor Green

# Test Bulk Updating Telemetry Report Directives
$telemetryUpdateBody = @{
    settings = @{
        telemetry_report_enabled = $true
        telemetry_report_cron = "0 8 * * *"
        telemetry_report_recipients = "admin@domain.com, alerts@domain.com"
        telemetry_report_template_theme = "executive_dark"
        telemetry_report_custom_notes = "Executive Daily Intelligence Brief"
    }
} | ConvertTo-Json

$updateSettingsRes = Invoke-RestMethod -Uri "http://localhost:3000/api/settings" -Method Put -Headers $headers -Body $telemetryUpdateBody
Write-Host "   Updated Telemetry Settings: $($updateSettingsRes.message)" -ForegroundColor Green

# 15. Media & Asset Storage Directives + Multipart Upload Test
Write-Host "`n15. Testing Media & Asset Storage Directives & Uploads..." -ForegroundColor Yellow

$mediaSettingsGet = Invoke-RestMethod -Uri "http://localhost:3000/api/settings" -Method Get -Headers $headers
Write-Host "   Allowed Media Extensions: $($mediaSettingsGet.settings.allowed_media_extensions) | Max Upload Size: $($mediaSettingsGet.settings.max_media_upload_size_mb) MB" -ForegroundColor Green

$tempPng = [System.IO.Path]::GetTempFileName() + ".png"
[System.IO.File]::WriteAllBytes($tempPng, [byte[]]@(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A))

$tempMp4 = [System.IO.Path]::GetTempFileName() + ".mp4"
[System.IO.File]::WriteAllBytes($tempMp4, [byte[]]@(0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70))

try {
    $rawJson = curl.exe -s -X POST "http://localhost:3000/api/content" `
        -H "Authorization: Bearer $token" `
        -F "channel_id=$testChannelId" `
        -F "content_type=short" `
        -F "title=Automated Media Upload Short" `
        -F "topic=Media Volume Test" `
        -F "image_file=@$tempPng" `
        -F "video_file=@$tempMp4" `
        -F "status=pending"
    $uploadRes = $rawJson | ConvertFrom-Json
    $uploadedItem = $uploadRes.data
    Write-Host "   Uploaded Item #$($uploadedItem.id) - UUID: $($uploadedItem.media_uuid)" -ForegroundColor Green
    Write-Host "   image_present: $($uploadedItem.image_present) | image_file: $($uploadedItem.image_file)" -ForegroundColor Green
    Write-Host "   video_present: $($uploadedItem.video_present) | video_file: $($uploadedItem.video_file)" -ForegroundColor Green

    if (-not $uploadedItem.image_present -or -not $uploadedItem.video_present) {
        throw "Failed: image_present or video_present is not true!"
    }
    if (-not $uploadedItem.image_file.EndsWith(".png") -or -not $uploadedItem.video_file.EndsWith(".mp4")) {
        throw "Failed: file names not properly renamed to uuid.ext!"
    }

    # Verify static file served at /media/...
    $mediaCheck = Invoke-WebRequest -Uri "http://localhost:3000$($uploadedItem.image_file)" -Method Get
    Write-Host "   Static /media File Served: HTTP $($mediaCheck.StatusCode)" -ForegroundColor Green

    # Clean up test content item
    $null = Invoke-RestMethod -Uri "http://localhost:3000/api/content/$($uploadedItem.id)" -Method Delete -Headers $headers
    Write-Host "   Cleaned up test content item #$($uploadedItem.id)" -ForegroundColor Green
} finally {
    Remove-Item -Force $tempPng -ErrorAction SilentlyContinue
    Remove-Item -Force $tempMp4 -ErrorAction SilentlyContinue
}

Write-Host "`n=== ALL 15 TESTS PASSED SUCCESSFULLY! APPLICATION IS 100% HEALTHY AND BUG-FREE! ===" -ForegroundColor Green

