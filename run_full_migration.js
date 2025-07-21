import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  FIREBASE_COLLECTIONS: ['users', 'user_libary', 'books'],
  BATCH_SIZE: 1000,
  OFFSET: 0
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, args = [], cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    log(`\n🔄 Running: ${command} ${args.join(' ')}`, 'cyan');
    
    const child = spawn(command, args, { 
      cwd, 
      stdio: 'inherit',
      shell: true 
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        log(`✅ Command completed successfully`, 'green');
        resolve();
      } else {
        log(`❌ Command failed with code ${code}`, 'red');
        reject(new Error(`Command failed: ${command} ${args.join(' ')}`));
      }
    });
    
    child.on('error', (error) => {
      log(`❌ Error running command: ${error.message}`, 'red');
      reject(error);
    });
  });
}

function checkFileExists(filePath) {
  const exists = fs.existsSync(filePath);
  if (exists) {
    log(`✅ Found: ${filePath}`, 'green');
  } else {
    log(`❌ Missing: ${filePath}`, 'red');
  }
  return exists;
}

function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return `${(stats.size / 1024).toFixed(1)}KB`;
  } catch {
    return 'Unknown';
  }
}

async function runFullMigration() {
  try {
    log('🚀 Starting Firebase to PocketBase Migration', 'bright');
    log('===============================================', 'cyan');
    
    // Step 1: Export and Import Firebase Auth Users
    log('\n📋 STEP 1: Firebase Authentication Users', 'yellow');
    log('==========================================', 'yellow');
    
    const authDir = path.join(process.cwd(), 'auth');
    if (!fs.existsSync(authDir)) {
      throw new Error('Auth directory not found. Please ensure you are in the correct project directory.');
    }
    
    // Check for firebase-service.json
    const authServiceFile = path.join(authDir, 'firebase-service.json');
    if (!checkFileExists(authServiceFile)) {
      throw new Error('firebase-service.json not found in auth directory');
    }
    
    process.chdir(authDir);
    
    // Export Firebase Auth users
    await runCommand('node', ['firestoreusers2json.js', 'firebase_auth_users.json', '100']);
    
    // Import to PocketBase
    await runCommand('node', ['import_userpb.js']);
    
    // Step 2: Export Firestore Collections
    log('\n📋 STEP 2: Export Firestore Collections', 'yellow');
    log('=========================================', 'yellow');
    
    const firestoreDir = path.join(process.cwd(), '..', 'firestore');
    process.chdir(firestoreDir);
    
    // Check for firebase-service.json
    const firestoreServiceFile = path.join(firestoreDir, 'firebase-service.json');
    if (!checkFileExists(firestoreServiceFile)) {
      throw new Error('firebase-service.json not found in firestore directory');
    }
    
    // Export each collection
    for (const collection of CONFIG.FIREBASE_COLLECTIONS) {
      log(`\n📦 Exporting collection: ${collection}`, 'magenta');
      await runCommand('node', ['firestore2json.js', collection, CONFIG.BATCH_SIZE.toString(), CONFIG.OFFSET.toString()]);
    }
    
    // Verify exported files
    log('\n📊 Verifying exported files:', 'cyan');
    const expectedFiles = [
      'users.json', 'userData.json',
      'user_libary.json', 'listen.json', 'warengruppen.json', 'epubcfi.json',
      'books.json', 'tags.json', 'links.json', 'leseexemplar.json'
    ];
    
    const missingFiles = [];
    for (const file of expectedFiles) {
      if (checkFileExists(file)) {
        log(`  ${file}: ${getFileSize(file)}`, 'green');
      } else {
        missingFiles.push(file);
      }
    }
    
    if (missingFiles.length > 0) {
      log(`⚠️  Warning: Missing files: ${missingFiles.join(', ')}`, 'yellow');
    }
    
    // Step 3: Import Collections to PocketBase
    log('\n📋 STEP 3: Import Collections to PocketBase', 'yellow');
    log('=============================================', 'yellow');
    
    const importOrder = [
      'users.json users',
      'userData.json userData',
      'user_libary.json libary',
      'listen.json listen',
      'warengruppen.json warengruppen',
      'epubcfi.json epubcfi',
      'books.json books',
      'tags.json tags',
      'links.json links',
      'leseexemplar.json leseexemplar'
    ];
    
    for (const importCmd of importOrder) {
      const [jsonFile, collection] = importCmd.split(' ');
      if (fs.existsSync(jsonFile)) {
        log(`\n📥 Importing: ${collection}`, 'magenta');
        await runCommand('node', ['json2pocketbase_v2.js', jsonFile, collection]);
      } else {
        log(`⚠️  Skipping ${collection} (file not found)`, 'yellow');
      }
    }
    
    // Verify ID mappings file was created
    if (checkFileExists('id_mappings.json')) {
      log(`📋 ID mappings created: ${getFileSize('id_mappings.json')}`, 'green');
    } else {
      throw new Error('id_mappings.json was not created. Import may have failed.');
    }
    
    // Step 4: Link All Relationships
    log('\n📋 STEP 4: Link All Relationships', 'yellow');
    log('===================================', 'yellow');
    
    // Link core relationships
    log('\n🔗 Linking core relationships...', 'magenta');
    await runCommand('node', ['link_all_relations.js']);
    
    // Link user collections
    log('\n🔗 Linking user collections...', 'magenta');
    await runCommand('node', ['link_user_collections.js']);
    
    // Step 5: Final Verification
    log('\n📋 STEP 5: Migration Complete!', 'yellow');
    log('==============================', 'yellow');
    
    log('\n🎉 Migration completed successfully!', 'green');
    log('\n📊 Generated Files:', 'cyan');
    
    const finalFiles = [
      'firebase_auth_users.json',
      'users.json', 'userData.json',
      'user_libary.json', 'listen.json', 'warengruppen.json', 'epubcfi.json',
      'books.json', 'tags.json', 'links.json', 'leseexemplar.json',
      'id_mappings.json'
    ];
    
    for (const file of finalFiles) {
      if (fs.existsSync(file)) {
        log(`  ✅ ${file} (${getFileSize(file)})`, 'green');
      }
    }
    
    log('\n🔍 Next Steps:', 'cyan');
    log('1. Check PocketBase admin panel for imported data');
    log('2. Verify record counts match your Firebase collections');
    log('3. Test relationship linking by checking relation arrays');
    log('4. Review migration logs for any warnings or errors');
    
    log('\n✨ Your Firebase data has been successfully migrated to PocketBase!', 'bright');
    
  } catch (error) {
    log(`\n💥 Migration failed: ${error.message}`, 'red');
    log('\n🔧 Troubleshooting tips:', 'yellow');
    log('1. Check your PocketBase server is running and accessible');
    log('2. Verify admin credentials in configuration files');
    log('3. Ensure firebase-service.json files are in correct locations');
    log('4. Check console output above for specific error details');
    log('5. You can re-run individual steps if needed');
    
    process.exit(1);
  }
}

// Handle process interruption
process.on('SIGINT', () => {
  log('\n\n🛑 Migration interrupted by user', 'yellow');
  log('You can resume by running individual steps from the migration guide.', 'cyan');
  process.exit(0);
});

// Start migration
log('Firebase to PocketBase Migration Tool', 'bright');
log('====================================', 'cyan');
log('This will perform a complete migration of your Firebase data to PocketBase.');
log('Make sure your PocketBase server is running and you have proper credentials configured.\n');

// Add a small delay to let user read the intro
setTimeout(() => {
  runFullMigration();
}, 2000);