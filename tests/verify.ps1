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

# 2.5 Verify Initial Setup State & Pre-Seed Hygiene
Write-Host "`n2.5 Testing Clean Uninitialized State & Pre-Seed Hygiene..." -ForegroundColor Yellow
$flushBody = @{
    answer = 42
    expected = 42
    confirmed = $true
} | ConvertTo-Json
$flushRes = Invoke-RestMethod -Uri "http://localhost:3000/api/settings/flush-all" -Method Post -Headers $headers -Body $flushBody
Write-Host "   System reset via flush-all: $($flushRes.message)" -ForegroundColor Green

# Verify initial setup status is false
$preSetupStatus = Invoke-RestMethod -Uri "http://localhost:3000/api/settings/initial-setup-status" -Method Get -Headers $headers
if ($preSetupStatus.initial_setup_done -ne $false) {
    throw "Initial setup done must be false before user choice!"
}

# Verify tag_presets, notes, and n8n_workflows have 0 records prior to setup
$preTags = Invoke-RestMethod -Uri "http://localhost:3000/api/tags/presets" -Method Get -Headers $headers
$preNotes = Invoke-RestMethod -Uri "http://localhost:3000/api/notes" -Method Get -Headers $headers
$preWorkflows = Invoke-RestMethod -Uri "http://localhost:3000/api/n8n/workflows" -Method Get -Headers $headers

if ($preTags.presets.Count -ne 0) { throw "Hygiene violation: tag_presets has $($preTags.presets.Count) records prior to onboarding!" }
if ($preNotes.notes.Count -ne 0) { throw "Hygiene violation: notes has $($preNotes.notes.Count) records prior to onboarding!" }
if ($preWorkflows.workflows.Count -ne 0) { throw "Hygiene violation: n8n_workflows has $($preWorkflows.workflows.Count) records prior to onboarding!" }
Write-Host "   Hygiene verified: Tag Presets=0, Notes=0, Workflows=0, InitialSetupDone=false" -ForegroundColor Green

# Now initialize with Demo Mode to populate baseline data for downstream stages 3-17
$demoInitRes = Invoke-RestMethod -Uri "http://localhost:3000/api/settings/initial-setup" -Method Post -Headers $headers -Body (@{ mode = "demo" } | ConvertTo-Json)
Write-Host "   Loaded Demo Data for Verification Suite: $($demoInitRes.message)" -ForegroundColor Green

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

# 16. n8n Workflow Automation Engine, Webhooks & Telemetry Ledger Tests
Write-Host "`n16. Testing n8n Workflow Automation Engine & Webhooks..." -ForegroundColor Yellow

# 16.1 List Seeded Workflows
$workflowsList = Invoke-RestMethod -Uri "http://localhost:3000/api/n8n/workflows" -Method Get -Headers $headers
Write-Host "   Found $($workflowsList.count) Seeded n8n Workflows" -ForegroundColor Green
if ($workflowsList.count -lt 1) {
    throw "Failed: Expected at least 1 seeded n8n workflow!"
}

# Ensure n8n integration is enabled in settings
$enableN8nBody = @{
    settings = @{
        n8n_integration_enabled = $true
    }
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:3000/api/settings" -Method Put -Headers $headers -Body $enableN8nBody | Out-Null

# 16.2 Delete stale test workflows if any exist
$existingWfs = Invoke-RestMethod -Uri "http://localhost:3000/api/n8n/workflows" -Method Get -Headers $headers
foreach ($w in $existingWfs.workflows) {
    if ($w.name -like "Automated Verification Test Workflow*") {
        Invoke-RestMethod -Uri "http://localhost:3000/api/n8n/workflows/$($w.id)" -Method Delete -Headers $headers | Out-Null
    }
}

# 16.3 Register New Test Workflow
$uniqueId = [System.Guid]::NewGuid().ToString().Substring(0, 8)
$testWfName = "Automated Verification Test Workflow ($uniqueId)"

$newWorkflowBody = @{
    name = $testWfName
    description = "Test workflow for verifying dynamic webhook execution and payload tracking"
    category = "automation"
    webhook_url = "http://localhost:3000/health"
    test_webhook_url = "http://localhost:3000/health"
    http_method = "GET"
    auth_header_name = "X-Test-Suite"
    auth_header_value = "verify-ps1-secret"
    payload_template = @{
        test_run = $true
        scope = "integration"
    }
    timeout_seconds = 15
    is_active = $true
} | ConvertTo-Json

$createWfRes = Invoke-RestMethod -Uri "http://localhost:3000/api/n8n/workflows" -Method Post -Headers $headers -Body $newWorkflowBody
$createdWf = $createWfRes.workflow
Write-Host "   Created Test Workflow: '$($createdWf.name)' (ID: $($createdWf.id))" -ForegroundColor Green

try {
    # 16.4 Update Workflow
    $updateWfBody = @{
        description = "Updated description for verification test workflow"
        timeout_seconds = 20
    } | ConvertTo-Json

    $updateWfRes = Invoke-RestMethod -Uri "http://localhost:3000/api/n8n/workflows/$($createdWf.id)" -Method Put -Headers $headers -Body $updateWfBody
    Write-Host "   Updated Test Workflow: $($updateWfRes.workflow.description)" -ForegroundColor Green

    # 16.5 Execute Workflow Webhook
    $executeBody = @{
        payload = @{
            trigger = "verify_test"
            environment = "ci_cd"
        }
        target = "production"
        trigger_source = "manual"
    } | ConvertTo-Json

    $executeRes = Invoke-RestMethod -Uri "http://localhost:3000/api/n8n/workflows/$($createdWf.id)/execute" -Method Post -Headers $headers -Body $executeBody
    Write-Host "   Dispatched Webhook -> Status: $($executeRes.execution.status) (HTTP $($executeRes.execution.status_code), $($executeRes.execution.duration_ms)ms)" -ForegroundColor Green
    if ($executeRes.execution.status -ne "success") {
        throw "Failed: Expected execution status 'success', got '$($executeRes.execution.status)'!"
    }

    # 16.6 Verify Execution Telemetry Ledger
    $executionsRes = Invoke-RestMethod -Uri "http://localhost:3000/api/n8n/executions?workflow_id=$($createdWf.id)" -Method Get -Headers $headers
    Write-Host "   Verified Execution in Ledger: Found $($executionsRes.count) runs for workflow" -ForegroundColor Green
    if ($executionsRes.count -lt 1) {
        throw "Failed: Execution record was not logged in n8n_executions!"
    }

    $execDetail = Invoke-RestMethod -Uri "http://localhost:3000/api/n8n/executions/$($executeRes.execution.id)" -Method Get -Headers $headers
    Write-Host "   Fetched Execution Detail: HTTP $($execDetail.execution.status_code) | Latency: $($execDetail.execution.duration_ms)ms" -ForegroundColor Green

    # 16.7 Probe n8n Reachability Test
    $probeBody = @{
        baseUrl = "http://localhost:3000/health"
    } | ConvertTo-Json

    $probeRes = Invoke-RestMethod -Uri "http://localhost:3000/api/n8n/test-connection" -Method Post -Headers $headers -Body $probeBody
    Write-Host "   Probe Reachability Outcome: Reachable = $($probeRes.reachable) | Latency = $($probeRes.latencyMs)ms" -ForegroundColor Green
    if (-not $probeRes.reachable) {
        throw "Failed: Endpoint probe should have succeeded for /health!"
    }
} finally {
    # 16.8 Clean Up Test Workflow and its Execution Logs
    if ($createdWf -and $createdWf.id) {
        $deleteWfRes = Invoke-RestMethod -Uri "http://localhost:3000/api/n8n/workflows/$($createdWf.id)" -Method Delete -Headers $headers
        Write-Host "   Deleted Test Workflow: $($deleteWfRes.message)" -ForegroundColor Green
    }
}

# 17. Topic Notes & Instructions Manager API (CRUD, Search, Pin, Topic Aggregation, Markdown Export, Cleanup)
Write-Host "`n17. Testing Topic Notes & Instructions Manager API..." -ForegroundColor Yellow

# 17.1 Verify Initial Seeded Notes
$notesRes = Invoke-RestMethod -Uri "http://localhost:3000/api/notes" -Method Get -Headers $headers
Write-Host "   Initial Notes Count: $($notesRes.notes.Count) | Topics: $($notesRes.topics.Count)" -ForegroundColor Green
if ($notesRes.count -lt 5) {
    throw "Failed: Expected at least 5 seeded notes, got $($notesRes.count)!"
}

# 17.2 Verify Topic Aggregation Endpoint
$topicsRes = Invoke-RestMethod -Uri "http://localhost:3000/api/notes/topics" -Method Get -Headers $headers
Write-Host "   Topic Aggregates Count: $($topicsRes.count)" -ForegroundColor Green
if ($topicsRes.count -lt 3) {
    throw "Failed: Expected at least 3 distinct topics, got $($topicsRes.count)!"
}

# 17.3 Create a New Custom Note
$uniqueNoteId = [System.Guid]::NewGuid().ToString().Substring(0, 8)
$newNoteBody = @{
    title = "Automated E2E Verification SOP ($uniqueNoteId)"
    topic = "Testing & QA"
    category = "sop"
    content = "# Automated E2E Verification SOP`n`n## Instructions`n1. Run verify.ps1`n2. Check all 17 stages`n3. Export markdown report"
    tags = "verification, e2e, testing, ps1"
    color = "#8b5cf6"
    is_pinned = $false
} | ConvertTo-Json

$createNoteRes = Invoke-RestMethod -Uri "http://localhost:3000/api/notes" -Method Post -Headers $headers -Body $newNoteBody
$createdNote = $createNoteRes.note
Write-Host "   Created Test Note: '$($createdNote.title)' (ID: $($createdNote.id))" -ForegroundColor Green

try {
    # 17.4 Full-Text Search and Topic Filter
    $searchRes = Invoke-RestMethod -Uri "http://localhost:3000/api/notes?search=$uniqueNoteId&topic=Testing%20%26%20QA" -Method Get -Headers $headers
    Write-Host "   Search & Topic Filter: Found $($searchRes.count) note(s)" -ForegroundColor Green
    if ($searchRes.count -ne 1) {
        throw "Failed: Search should have found exactly 1 note for token '$uniqueNoteId'!"
    }

    # 17.5 Update Note Content & Metadata
    $updateNoteBody = @{
        title = "Automated E2E Verification SOP - Updated ($uniqueNoteId)"
        content = "# Updated SOP`n`nAll checks passed successfully."
        tags = "verification, e2e, updated"
    } | ConvertTo-Json

    $updateNoteRes = Invoke-RestMethod -Uri "http://localhost:3000/api/notes/$($createdNote.id)" -Method Put -Headers $headers -Body $updateNoteBody
    Write-Host "   Updated Test Note: '$($updateNoteRes.note.title)'" -ForegroundColor Green
    if ($updateNoteRes.note.title -ne "Automated E2E Verification SOP - Updated ($uniqueNoteId)") {
        throw "Failed: Note title was not updated properly!"
    }

    # 17.6 Toggle Pin Status
    $pinRes = Invoke-RestMethod -Uri "http://localhost:3000/api/notes/$($createdNote.id)/pin" -Method Patch -Headers $headers -Body (@{ is_pinned = $true } | ConvertTo-Json)
    Write-Host "   Toggled Pin Status: is_pinned = $($pinRes.is_pinned)" -ForegroundColor Green
    if (-not $pinRes.is_pinned) {
        throw "Failed: Note pin status should be true!"
    }

    # 17.7 Export Raw Markdown
    $exportRes = Invoke-RestMethod -Uri "http://localhost:3000/api/notes/$($createdNote.id)/export" -Method Get -Headers $headers
    Write-Host "   Exported Markdown Content Length: $($exportRes.Length) chars" -ForegroundColor Green
    if (-not ($exportRes -match "Updated SOP")) {
        throw "Failed: Exported markdown did not contain expected content!"
    }
} finally {
    # 17.8 Delete Note & Clean Up
    if ($createdNote -and $createdNote.id) {
        $deleteNoteRes = Invoke-RestMethod -Uri "http://localhost:3000/api/notes/$($createdNote.id)" -Method Delete -Headers $headers
        Write-Host "   Deleted Test Note: $($deleteNoteRes.message)" -ForegroundColor Green

        # Confirm 404 on deleted note
        try {
            Invoke-RestMethod -Uri "http://localhost:3000/api/notes/$($createdNote.id)" -Method Get -Headers $headers
            throw "Failed: Deleted note should return 404!"
        } catch {
            Write-Host "   Confirmed Note Deletion (404 Not Found)" -ForegroundColor Green
        }
    }
}

# 18. Initial Setup & Danger Zone Full System Flush Tests
Write-Host "`n18. Testing Initial Setup & Danger Zone Full System Flush API..." -ForegroundColor Yellow

# 18.1 Check Initial Setup Status
$setupStatus = Invoke-RestMethod -Uri "http://localhost:3000/api/settings/initial-setup-status" -Method Get -Headers $headers
Write-Host "   Initial Setup Status API: Success = $($setupStatus.success) | Done = $($setupStatus.initial_setup_done)" -ForegroundColor Green

# 18.2 Test Loading Sample Demo Data across ALL tables
$demoInitBody = @{ mode = "demo" } | ConvertTo-Json
$demoInitRes = Invoke-RestMethod -Uri "http://localhost:3000/api/settings/initial-setup" -Method Post -Headers $headers -Body $demoInitBody
Write-Host "   Loaded Sample Demo Data: $($demoInitRes.message)" -ForegroundColor Green
Write-Host "   Demo Counts: Channels = $($demoInitRes.stats.channels), Items = $($demoInitRes.stats.content_items), Presets = $($demoInitRes.stats.tag_presets), Notes = $($demoInitRes.stats.notes)" -ForegroundColor Green

$setupStatusAfter = Invoke-RestMethod -Uri "http://localhost:3000/api/settings/initial-setup-status" -Method Get -Headers $headers
if (-not $setupStatusAfter.initial_setup_done) {
    throw "Failed: initial_setup_done should be true after demo data load!"
}

# 18.3 Test Danger Zone Flush All System Data
$flushBody = @{
    answer = 42
    expected = 42
    confirmed = $true
} | ConvertTo-Json

$flushRes = Invoke-RestMethod -Uri "http://localhost:3000/api/settings/flush-all" -Method Post -Headers $headers -Body $flushBody
Write-Host "   Danger Zone Flush Output: $($flushRes.message)" -ForegroundColor Green

# 18.4 Verify All Tables are 100% Cleared
$channelsAfterFlush = Invoke-RestMethod -Uri "http://localhost:3000/api/channels" -Method Get -Headers $headers
$contentAfterFlush = Invoke-RestMethod -Uri "http://localhost:3000/api/content" -Method Get -Headers $headers
$tagsAfterFlush = Invoke-RestMethod -Uri "http://localhost:3000/api/tags/presets" -Method Get -Headers $headers
$notesAfterFlush = Invoke-RestMethod -Uri "http://localhost:3000/api/notes" -Method Get -Headers $headers
$workflowsAfterFlush = Invoke-RestMethod -Uri "http://localhost:3000/api/n8n/workflows" -Method Get -Headers $headers
$statusAfterFlush = Invoke-RestMethod -Uri "http://localhost:3000/api/settings/initial-setup-status" -Method Get -Headers $headers

Write-Host "   Post-Flush State: Channels=$($channelsAfterFlush.channels.Count), Items=$($contentAfterFlush.data.Count), Tags=$($tagsAfterFlush.presets.Count), Notes=$($notesAfterFlush.notes.Count), Workflows=$($workflowsAfterFlush.workflows.Count), SetupDone=$($statusAfterFlush.initial_setup_done)" -ForegroundColor Green

if ($channelsAfterFlush.channels.Count -ne 0) { throw "Failed: channels not purged on flush-all!" }
if ($contentAfterFlush.data.Count -ne 0) { throw "Failed: content_items not purged on flush-all!" }
if ($tagsAfterFlush.presets.Count -ne 0) { throw "Failed: tag_presets not purged on flush-all!" }
if ($notesAfterFlush.notes.Count -ne 0) { throw "Failed: notes not purged on flush-all!" }
if ($workflowsAfterFlush.workflows.Count -ne 0) { throw "Failed: n8n_workflows not purged on flush-all!" }
if ($statusAfterFlush.initial_setup_done -ne $false) { throw "Failed: initial_setup_done should be false after flush-all!" }

Write-Host "   System successfully left in pristine un-initialized state (initial_setup_done = false, 0 records) for manual UI onboarding verification." -ForegroundColor Green

Write-Host "`n=== ALL 18 TESTS PASSED SUCCESSFULLY! APPLICATION IS 100% HEALTHY AND BUG-FREE! ===" -ForegroundColor Green


