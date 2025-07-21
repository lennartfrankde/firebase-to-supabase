# Setup Guide for Firebase to PocketBase Migration

## Quick Setup

### 1. Environment Setup

```bash
# Clone or setup your project
cd g:\Git\firebase-to-supabase

# Install dependencies (if not already done)
npm install pocketbase axios

# Add to package.json if missing:
# "type": "module"
```

### 2. Configuration

**Update these files with your credentials:**

`auth/import_userpb.js`:
```javascript
const POCKETBASE_URL = "https://your-pocketbase-url.com";
const ADMIN_EMAIL = "your-admin@email.com";
const ADMIN_PASSWORD = "your-admin-password";
```

`firestore/json2pocketbase_v2.js`:
```javascript
const POCKETBASE_URL = "https://your-pocketbase-url.com";
const ADMIN_EMAIL = "your-admin@email.com";
const ADMIN_PASSWORD = "your-admin-password";
```

`firestore/link_*.js` (all linking scripts):
```javascript
const POCKETBASE_URL = "https://your-pocketbase-url.com";
const ADMIN_EMAIL = "your-admin@email.com";
const ADMIN_PASSWORD = "your-admin-password";
```

### 3. Firebase Service Account

Place your `firebase-service.json` file in:
- `g:\Git\firebase-to-supabase\auth\firebase-service.json`
- `g:\Git\firebase-to-supabase\firestore\firebase-service.json`

### 4. PocketBase Schema

Ensure your PocketBase collections have these fields:

**users collection:**
- All standard user fields
- `libary` (relation to libary collection)
- `userData` (relation to userData collection)

**books collection:**
- `firebaseId` (text field)
- `Schlagworte` (relation to tags, multiple)
- `Leseexemplar` (relation to leseexemplar, multiple)
- All other book fields

**libary collection:**
- `firebaseId` (text field)
- `Listen` (relation to listen, multiple)
- `Warengruppen` (relation to warengruppen, multiple)
- `epubcfi` (relation to epubcfi, multiple)
- `books`, `favoriten`, `gelesen` (relation to books, multiple)

**listen/warengruppen collections:**
- `firebaseId` (text field)
- `userId` (text field)
- `books` (relation to books, multiple)

**epubcfi collection:**
- `firebaseId` (text field)
- `userId` (text field)
- `book` (relation to books, single)

## Quick Migration

```bash
# 1. Export and import Firebase Auth users
cd auth
node firestoreusers2json.js firebase_auth_users.json 100
node import_userpb.js

# 2. Export Firestore data
cd ../firestore
node firestore2json.js users 1000 0
node firestore2json.js user_libary 1000 0
node firestore2json.js books 1000 0

# 3. Import all collections
node json2pocketbase_v2.js users.json users
node json2pocketbase_v2.js userData.json userData
node json2pocketbase_v2.js user_libary.json libary
node json2pocketbase_v2.js listen.json listen
node json2pocketbase_v2.js warengruppen.json warengruppen
node json2pocketbase_v2.js epubcfi.json epubcfi
node json2pocketbase_v2.js books.json books
node json2pocketbase_v2.js tags.json tags
node json2pocketbase_v2.js links.json links
node json2pocketbase_v2.js leseexemplar.json leseexemplar

# 4. Link all relationships
node link_all_relations.js
node link_user_collections.js
```

## Verification

After migration, check:

1. **Record counts match** between Firebase and PocketBase
2. **Relationships are populated** (no empty relation arrays)
3. **id_mappings.json exists** with complete mappings
4. **Sample data looks correct** in PocketBase admin panel

## Troubleshooting

- **Import fails**: Check credentials and PocketBase URL
- **No relationships**: Ensure `id_mappings.json` exists
- **Missing records**: Check console output for errors
- **Schema errors**: Verify PocketBase collection schemas match requirements

Your Firebase data should now be fully migrated to PocketBase!