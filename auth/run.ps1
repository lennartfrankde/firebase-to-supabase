# Firebase to Supabase Migration Script
Write-Host "Starting Firebase to Supabase user migration process..." -ForegroundColor Cyan

# Step 1: Export Firestore users to JSON
Write-Host "Exporting Firestore users to JSON..." -ForegroundColor Yellow
$process1 = Start-Process -FilePath "node" -ArgumentList "firestoreusers2json dump_test.json" -Wait -PassThru -NoNewWindow
if ($process1.ExitCode -ne 0) {
    Write-Host "Error exporting Firestore users. Aborting process." -ForegroundColor Red
    exit 1
}
Write-Host "Successfully exported Firestore users to dump_test.json" -ForegroundColor Green

# Step 2: Import users to PocketBase
Write-Host "Importing users to PocketBase..." -ForegroundColor Yellow
$process2 = Start-Process -FilePath "node" -ArgumentList "import_userpb" -Wait -PassThru -NoNewWindow
if ($process2.ExitCode -ne 0) {
    Write-Host "Error importing users to PocketBase. Aborting process." -ForegroundColor Red
    exit 1
}
Write-Host "Successfully imported users to PocketBase" -ForegroundColor Green

# Final success message
Write-Host "Migration process completed successfully!" -ForegroundColor Cyan
Write-Host "Users have been exported from Firebase and imported into PocketBase." -ForegroundColor Cyan