# 🔥 Firebase to PocketBase Migration Guide

**Complete, tested migration process with automatic relationship linking**

This guide provides a comprehensive solution for migrating your Firebase data to PocketBase with full relationship preservation.

## Prerequisites

- **Firebase Service Account**: `firebase-service.json` in appropriate directories
- **PocketBase Instance**: Running server with admin credentials configured
- **Node.js**: Version 16+ with ES modules support
- **Dependencies**: All required npm packages installed

## Migration Overview

**Total Time**: 30-60 minutes depending on data volume

**Process**:

1. Export Firebase Authentication users
2. Export Firestore collections to JSON
3. Import to PocketBase with ID mapping
4. Link all relationships automatically

---

## 🚀 Complete Migration Process

### Step 1: Export Firebase Authentication Users

```bash
cd g:\Git\firebase-to-supabase\auth
node firestoreusers2json.js firebase_auth_users.json 100
node import_userpb.js
```

_Creates and imports all Firebase Auth users to PocketBase_

### Step 2: Export Firestore Collections

```bash
cd g:\Git\firebase-to-supabase\firestore

# Export all collections
node firestore2json.js users 1000 0
node firestore2json.js user_libary 1000 0
node firestore2json.js books 1000 0
```

_Generates JSON files with extracted sub-collections_

### Step 3: Import All Collections with ID Mapping

```bash
# Core user data
node json2pocketbase_v2.js users.json users
node json2pocketbase_v2.js userData.json userData

# Library collections
node json2pocketbase_v2.js user_libary.json libary
node json2pocketbase_v2.js listen.json listen
node json2pocketbase_v2.js warengruppen.json warengruppen
node json2pocketbase_v2.js epubcfi.json epubcfi

# Books and related
node json2pocketbase_v2.js books.json books
node json2pocketbase_v2.js tags.json tags
node json2pocketbase_v2.js links.json links
node json2pocketbase_v2.js leseexemplar.json leseexemplar
```

**Key Features**:

- ✅ Creates `id_mappings.json` with Firebase → PocketBase ID mappings
- ✅ Preserves original Firebase IDs in `firebaseId` fields
- ✅ Handles all data types and relationships
- ✅ Comprehensive error handling

### Step 4: Link All Relationships

```bash
# Link all relationships automatically
node link_all_relations.js
node link_user_collections.js
```

**What Gets Linked**:

- ✅ Users ↔ userData
- ✅ Users ↔ libary
- ✅ Books ↔ tags (bidirectional)
- ✅ Books ↔ leseexemplar
- ✅ Libary ↔ listen, warengruppen, epubcfi
- ✅ Listen/warengruppen/epubcfi ↔ books

---

## 📊 Verification

### Check PocketBase Admin Panel

**Expected Results**:

- Users collection: All Firebase Auth users
- Books collection: Complete with populated tag arrays
- Libary collection: All user libraries with relation arrays filled
- All relation fields populated (no empty arrays)

### Console Output Examples

```
✓ Listen → Books: 4
✓ Warengruppen → Books: 18
✓ Epubcfi → Books: 25
✓ Books linked to tags: 54
✓ All relationships established successfully
```

---

## 🔧 Troubleshooting

### Common Issues & Solutions

**Import Failures**

```bash
# Check PocketBase schema and admin credentials
# Verify JSON file structure and paths
```

**Relation Linking Issues**

```bash
# Ensure id_mappings.json exists and is complete
# Check that users have libary relationships established
# Verify original Firebase IDs match imported data
```

**Missing Records**

```bash
# Compare record counts between Firebase and PocketBase
# Check console output for specific error messages
# Verify all JSON files were created correctly
```

### Debug Commands

```bash
# Check ID mappings
cat id_mappings.json | jq '.users | length'

# Run with verbose logging
node link_user_collections.js 2>&1 | tee migration.log
```

---

## 📁 Generated Files

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
│   ├── leseexemplar.json
│   └── id_mappings.json      # 🔑 Critical mapping file
```

---

## ✅ Success Criteria

Migration is complete when:

- [ ] All Firebase Auth users imported to PocketBase
- [ ] All Firestore collections imported with correct counts
- [ ] `id_mappings.json` contains complete mapping dictionary
- [ ] All relationship arrays populated (users.libary, books.Schlagworte, etc.)
- [ ] User collections linked to books and libraries
- [ ] No validation errors or failed imports
- [ ] Manual verification in PocketBase admin confirms data integrity

---

## 🎯 Key Advantages

**Reliability**: Uses exact ID mappings instead of heuristic matching  
**Completeness**: Handles all relationship types automatically  
**Efficiency**: Single command linking for complex relationships  
**Transparency**: Detailed logging and error reporting  
**Recoverability**: Preserves original Firebase IDs for reference

**🎉 Result**: Your complete Firebase ecosystem migrated to PocketBase with all relationships intact!

---

## 📋 Quick Reference Commands

```bash
# Complete migration in 4 commands:
node import_userpb.js
node firestore2json.js users 1000 0 && node firestore2json.js user_libary 1000 0 && node firestore2json.js books 1000 0
for file in *.json; do node json2pocketbase_v2.js "$file" "${file%.json}"; done
node link_all_relations.js && node link_user_collections.js
```
