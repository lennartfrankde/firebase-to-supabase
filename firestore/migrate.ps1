# Firestore to PocketBase Migration Script
Write-Host "Starting Firestore to PocketBase migration process..." -ForegroundColor Cyan

# Step 1: Export Firestore users collection to JSON
Write-Host "Exporting Firestore users collection to JSON..." -ForegroundColor Yellow
$process1 = Start-Process -FilePath "node" -ArgumentList "firestore2json users" -Wait -PassThru -NoNewWindow
if ($process1.ExitCode -ne 0) {
    Write-Host "Error exporting Firestore users collection. Aborting process." -ForegroundColor Red
    exit 1
}
Write-Host "Successfully exported Firestore users collection to users.json" -ForegroundColor Green

# Step 2: Import users collection to PocketBase
Write-Host "Importing users collection to PocketBase..." -ForegroundColor Yellow
$process2 = Start-Process -FilePath "node" -ArgumentList "json2pocketbase ./users.json users" -Wait -PassThru -NoNewWindow
if ($process2.ExitCode -ne 0) {
    Write-Host "Error importing users collection to PocketBase. Aborting process." -ForegroundColor Red
    exit 1
}
Write-Host "Successfully imported users collection to PocketBase" -ForegroundColor Green

# Step 3: Import userData collection to PocketBase
Write-Host "Importing userData collection to PocketBase..." -ForegroundColor Yellow
$process3 = Start-Process -FilePath "node" -ArgumentList "json2pocketbase ./userData.json userData" -Wait -PassThru -NoNewWindow
if ($process3.ExitCode -ne 0) {
    Write-Host "Error importing userData collection to PocketBase. Aborting process." -ForegroundColor Red
    exit 1
}
Write-Host "Successfully imported userData collection to PocketBase" -ForegroundColor Green

# Step 4: Export Firestore books collection to JSON
Write-Host "Exporting Firestore books collection to JSON..." -ForegroundColor Yellow
$process4 = Start-Process -FilePath "node" -ArgumentList "firestore2json books" -Wait -PassThru -NoNewWindow
if ($process4.ExitCode -ne 0) {
    Write-Host "Error exporting Firestore books collection. Aborting process." -ForegroundColor Red
    exit 1
}
Write-Host "Successfully exported Firestore books collection to books.json" -ForegroundColor Green


# Final success message
Write-Host "Migration process completed successfully!" -ForegroundColor Cyan
Write-Host "Collections have been exported from Firestore and imported into PocketBase." -ForegroundColor Cyan