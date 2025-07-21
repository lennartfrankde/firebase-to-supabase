# Firebase to PocketBase Migration Guide

This guide walks you through the complete process of migrating your Firebase data to PocketBase.

## Prerequisites

1. **Firebase Service Account**: Ensure you have `firebase-service.json` in the appropriate directories
2. **PocketBase Instance**: Running PocketBase server with admin credentials
3. **Node.js**: Installed with ES modules support
4. **Dependencies**: All required npm packages installed

## Migration Order

**IMPORTANT**: Follow this exact order to ensure proper relations are established:

1. Firebase Authentication Users → PocketBase Users
2. Firestore `users` collection → PocketBase `users` + `userData`
3. Firestore `user_libary` collection → PocketBase `libary` + related collections
4. Firestore `books` collection → PocketBase `books` + related collections
5. Final relation linking and cleanup

---

## Step 1: Export Firebase Authentication Users

First, export all authentication users from Firebase:

```bash
cd g:\Git\firebase-to-supabase\auth
node firestoreusers2json.js firebase_auth_users.json 100
```

This creates `firebase_auth_users.json` with all Firebase Auth users.

## Step 2: Import Firebase Auth Users to PocketBase

Import the authentication users into PocketBase:

```bash
node import_userpb.js
```

**Note**: This script reads `dump_test.json` - you may need to rename `firebase_auth_users.json` to `dump_test.json` or update the script.

---

## Step 3: Export Firestore `users` Collection

```bash
cd g:\Git\firebase-to-supabase\firestore
node firestore2json.js users 1000 0
```

This creates:

- `users.json` - Main user records
- `userData.json` - User profile/contact information

## Step 4: Import Users Data to PocketBase

Import the main users collection:

```bash
node json2pocketbase.js users.json users
```

Import the userData collection:

```bash
node json2pocketbase.js userData.json userData
node link_userData.js
```

---

## Step 5: Export Firestore `user_libary` Collection

```bash
node firestore2json.js user_libary 1000 0
```

This creates:

- `user_libary.json` - Main library records
- `epubcfi.json` - Reading position data
- `listen.json` - User-created lists
- `warengruppen.json` - User-organized product groups

## Step 6: Import Library Data to PocketBase

Import in this order:

```bash
# Import main library records (with empty relation arrays)
node json2pocketbase.js user_libary.json libary
node link_libary.js

# Import user lists (with empty book arrays for now)
node json2pocketbase.js listen.json listen

# Import product groups (with empty book arrays for now)
node json2pocketbase.js warengruppen.json warengruppen

# Skip epubcfi for now - import after books are created
```

**Note**: `epubcfi` records will be imported after books in Step 8.

---

## Step 7: Export Firestore `books` Collection

```bash
node firestore2json.js books 1000 0
```

This creates:

- `books.json` - Main book records
- `tags.json` - Book tags/keywords
- `links.json` - Book-related links
- `leseexemplar.json` - Reading copy requests

## Step 8: Import Books Data to PocketBase

Import in this order:

```bash
# Import main book records first (with empty relation arrays)
node json2pocketbase.js books.json books

# Import tags (with empty book arrays for now)
node json2pocketbase.js tags.json tags

# Import reading copy requests
node json2pocketbase.js leseexemplar.json leseexemplar

# Now import epubcfi (reading positions) since books exist
node json2pocketbase.js epubcfi.json epubcfi
```

---

## Step 9: Link All Relations

After all basic records are imported, run the linking scripts:

```bash
# Link books to tags and leseexemplar
node link_book_relations.js

# Link libary to warengruppen, listen, and epubcfi
node link_libary_relations.js
```

---

## Step 10: Handle Additional Collections (if any)

If you have other Firestore collections, export and import them:

```bash
# Export additional collection
node firestore2json.js <collection_name> 1000 0

# Import to PocketBase
node json2pocketbase.js <collection_name>.json <collection_name>
```

---

## Step 10: Verify and Update Relations

After all data is imported, you may need to update some relations manually. Check your PocketBase admin panel for:

1. **Users**: Verify `libary` and `userData` relations are properly linked
2. **Books**: Check that `Schlagworte`, `Links`, and `Leseexemplar` arrays are populated
3. **Library**: Ensure all relation arrays are correctly populated

---

## Troubleshooting

### Common Issues:

1. **Relation Linking Failed**

   - Relations are created based on matching IDs
   - If a user/userData/libary has the same ID, they should auto-link
   - Check PocketBase logs for specific errors

2. **Import Errors**

   - Check that all required fields are present
   - Verify date fields are properly formatted
   - Ensure no circular references in relations

3. **Missing Records**
   - Check the console output for failed imports
   - Verify JSON files were created correctly
   - Check PocketBase admin panel for actual record counts

### Verification Commands:

Check record counts:

```bash
# In PocketBase admin panel, check Collections tab
# Compare counts with your Firebase collections
```

### Clean Up (if needed):

If you need to restart the migration:

1. Delete all records from PocketBase collections (via admin panel)
2. Delete generated JSON files
3. Restart from Step 1

---

## File Structure After Migration

Your directory should contain these JSON files:

```
g:\Git\firebase-to-supabase\
├── auth\
│   └── firebase_auth_users.json
├── firestore\
│   ├── users.json
│   ├── userData.json
│   ├── user_libary.json
│   ├── epubcfi.json
│   ├── listen.json
│   ├── warengruppen.json
│   ├── books.json
│   ├── tags.json
│   ├── links.json
│   └── leseexemplar.json
```

## Data Processing Logic

### Users Collection Processing (`users_processDocument.js`):

- Splits Firebase user data into `users` and `userData` records
- Handles role conversion from array to single highest role
- Maps Firebase auth fields to PocketBase schema
- Creates relations between users and userData with matching IDs

### Books Collection Processing (`books_processDocument.js`):

- Extracts `Schlagworte` into separate `tags` records
- Extracts `Links` into separate `links` records
- Processes `LeseexemplarAnfordern` into `leseexemplar` records
- Handles notification arrays as user ID arrays
- Maps all fields to PocketBase schema with proper date conversion

### User Library Processing (`user_libary_processDocument.js`):

- Extracts `epubcfi` map into separate `epubcfi` records
- Extracts `Listen` map into separate `listen` records
- Extracts `Warengruppen` map into separate `warengruppen` records
- Maintains relation arrays for direct book references

---

## Success Criteria

Migration is successful when:

- [ ] All Firebase Auth users are imported to PocketBase users
- [ ] All Firestore users are split into users + userData with proper relations
- [ ] All user libraries are imported with proper sub-collections
- [ ] All books are imported with proper tag/link/leseexemplar relations
- [ ] All record counts match between Firebase and PocketBase
- [ ] Relations are properly established and functional

**Estimated Migration Time**: 30-60 minutes depending on data volume and server performance.

---

## 🚀 IMPROVED MIGRATION PROCESS (RECOMMENDED)

Use these updated scripts for more reliable migration with comprehensive ID mapping:

### Import with ID Mapping

```bash
# 1. Import users (creates Firebase → PocketBase ID mappings)
node json2pocketbase_v2.js users.json users
node json2pocketbase_v2.js userData.json userData

# 2. Import library data
node json2pocketbase_v2.js user_libary.json libary
node json2pocketbase_v2.js listen.json listen
node json2pocketbase_v2.js warengruppen.json warengruppen

# 3. Import books and related data
node json2pocketbase_v2.js books.json books
node json2pocketbase_v2.js tags.json tags
node json2pocketbase_v2.js links.json links
node json2pocketbase_v2.js leseexemplar.json leseexemplar
node json2pocketbase_v2.js epubcfi.json epubcfi
```

### Link All Relations

```bash
# Link core relationships using ID mappings
node link_all_relations.js

# Link user collections (listen, warengruppen, epubcfi) to libary and books
node link_user_collections.js
```

### Key Improvements

1. **ID Mapping System**: Creates `id_mappings.json` with Firebase ID → PocketBase ID mappings
2. **Reliable Linking**: Uses exact ID mappings instead of field matching heuristics
3. **Comprehensive Relations**: Single script handles all relationship types
4. **Better Error Handling**: Detailed progress reporting and error tracking
5. **Firebase ID Storage**: Stores original Firebase IDs in `firebaseId` fields for reference

### Generated Files

- `id_mappings.json` - Complete Firebase → PocketBase ID mapping dictionary
- All relation arrays populated with correct PocketBase IDs
- All records linked properly without manual intervention
