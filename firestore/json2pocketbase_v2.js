import fs from "fs";
import PocketBase from "pocketbase";
import { randomBytes } from "crypto";
import path from "path";

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error(
    "Usage: node json2pocketbase_v2.js <jsonFile> <pocketbaseCollection>"
  );
  process.exit(1);
}

const jsonFilePath = args[0];
const collectionName = args[1];

// Configuration
const POCKETBASE_URL = "https://service.serverfrank.de";
const ADMIN_EMAIL = "lennart.frank@posteo.de";
const ADMIN_PASSWORD = "8@JFAp3ggGePBcEP";

// ID Mapping system
const ID_MAPPINGS_FILE = "./id_mappings.json";

function loadIdMappings() {
  if (fs.existsSync(ID_MAPPINGS_FILE)) {
    return JSON.parse(fs.readFileSync(ID_MAPPINGS_FILE, "utf8"));
  }
  return {};
}

function saveIdMappings(mappings) {
  fs.writeFileSync(ID_MAPPINGS_FILE, JSON.stringify(mappings, null, 2));
}

function addIdMapping(collectionName, firebaseId, pocketbaseId) {
  const mappings = loadIdMappings();
  if (!mappings[collectionName]) {
    mappings[collectionName] = {};
  }
  mappings[collectionName][firebaseId] = pocketbaseId;
  saveIdMappings(mappings);
  console.log(`💾 Mapped ${collectionName}: ${firebaseId} → ${pocketbaseId}`);
}

async function main() {
  try {
    // Initialize PocketBase client
    const pb = new PocketBase(POCKETBASE_URL);

    // Admin authentication
    await pb
      .collection("_superusers")
      .authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);

    // Read and parse JSON file
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, "utf8"));
    console.log(`Loaded ${jsonData.length} records from ${jsonFilePath}`);

    // Import data
    let successCount = 0;
    let errorCount = 0;

    for (const record of jsonData) {
      try {
        let recordData = {};
        let originalFirebaseId = null;

        // Extract Firebase ID and prepare record data based on collection type
        if (collectionName === "userData") {
          recordData = { ...record };
          originalFirebaseId = record.id;
          delete recordData.id; // Let PocketBase auto-generate
          recordData.firebaseId = originalFirebaseId; // Store for reference
        } else if (collectionName === "libary") {
          recordData = { ...record };
          originalFirebaseId = record.id;
          delete recordData.id; // Let PocketBase auto-generate
          recordData.firebaseId = originalFirebaseId; // Store for reference
          // Clear all relation arrays
          recordData.Leseexemplare = [];
          recordData.books = [];
          recordData.favoriten = [];
          recordData.gelesen = [];
          recordData.Listen = [];
          recordData.Warengruppen = [];
          recordData.epubcfi = [];
        } else if (collectionName === "books") {
          recordData = { ...record };
          originalFirebaseId = record.uid || record.id;
          delete recordData.id;
          recordData.firebaseId = originalFirebaseId; // Store for reference
          console.log(
            `📚 Book: "${record.Titel}" - Firebase ID: ${originalFirebaseId}`
          ); // Debug line
          // Clear file fields and relations
          recordData.Cover = "";
          recordData.LeseprobeFile = "";
          recordData.CoverFileName = "";
          recordData.LeseprobeFileName = "";
          recordData.LeseexemplarFileName = "";
          recordData.Schlagworte = [];
          recordData.Links = [];
          recordData.Leseexemplar = [];
          recordData.benachrichtigungLeseexemplar = [];
          recordData.benachrichtigungLeseprobe = [];
        } else if (collectionName === "tags") {
          recordData = { ...record };
          originalFirebaseId = record.id || generateTagId(record);
          recordData.firebaseId = originalFirebaseId; // Store for reference
          recordData.books = []; // Clear book relations
        } else if (collectionName === "links") {
          recordData = { ...record };
          originalFirebaseId = record.id || generateLinkId(record);
          recordData.firebaseId = originalFirebaseId; // Store for reference
        } else if (collectionName === "leseexemplar") {
          recordData = { ...record };
          originalFirebaseId = record.id || generateLeseexemplarId(record);
          recordData.firebaseId = originalFirebaseId; // Store for reference
          // Clear all relations
          recordData.userData = "";
          recordData.bookId = "";
          recordData.userId = "";
          recordData.verlagId = "";
        } else if (collectionName === "listen") {
          recordData = { ...record };
          originalFirebaseId = record.id || generateListenId(record);
          recordData.firebaseId = originalFirebaseId; // Store for reference
          recordData.books = []; // Clear book relations
        } else if (collectionName === "warengruppen") {
          recordData = { ...record };
          originalFirebaseId = record.id || generateWarengruppenId(record);
          recordData.firebaseId = originalFirebaseId; // Store for reference
          recordData.books = []; // Clear book relations
        } else if (collectionName === "epubcfi") {
          recordData = { ...record };
          originalFirebaseId = record.id || generateEpubcfiId(record);
          recordData.firebaseId = originalFirebaseId; // Store for reference
          delete recordData.book; // Clear book relation (will be linked later)
          // Keep userId field - don't clear it!
        } else if (collectionName === "users") {
          recordData = { ...record };
          originalFirebaseId = record.uid;
          // Keep all user data as-is for users collection
        } else {
          recordData = record;
          originalFirebaseId = record.id;
        }

        // Create record in PocketBase
        if (collectionName !== "users") {
          try {
            const createdRecord = await pb
              .collection(collectionName)
              .create(recordData);

            // Store Firebase ID → PocketBase ID mapping
            if (originalFirebaseId) {
              addIdMapping(
                collectionName,
                originalFirebaseId,
                createdRecord.id
              );
            }

            console.log(`✅ Created ${collectionName}: ${createdRecord.id}`);
            successCount++;
          } catch (createError) {
            console.error(
              `❌ Failed to create ${collectionName} record:`,
              createError.message
            );
            console.error(`Record data:`, JSON.stringify(recordData, null, 2));
            if (createError.data) {
              console.error(
                `Validation errors:`,
                JSON.stringify(createError.data, null, 2)
              );
            }
            errorCount++;
            continue;
          }
        } else {
          // Handle users collection (existing logic)
          try {
            const existingUsers = await pb.collection("users").getFullList();
            const existingUser = existingUsers.find(
              (u) => u.uid === recordData.uid
            );

            if (existingUser) {
              const updateData = { ...recordData };
              delete updateData.id;
              delete updateData.password;
              delete updateData.passwordConfirm;
              delete updateData.tokenKey;

              await pb.collection("users").update(existingUser.id, updateData);

              // Store mapping for existing user
              if (originalFirebaseId) {
                addIdMapping(
                  collectionName,
                  originalFirebaseId,
                  existingUser.id
                );
              }

              console.log(`✅ Updated user: ${recordData.uid}`);
            } else {
              const newUser = await pb.collection("users").create(recordData);

              // Store mapping for new user
              if (originalFirebaseId) {
                addIdMapping(collectionName, originalFirebaseId, newUser.id);
              }

              console.log(`✅ Created user: ${recordData.uid}`);
            }
            successCount++;
          } catch (userError) {
            console.error(
              `❌ Error handling user ${recordData.uid}:`,
              userError.message
            );
            errorCount++;
            continue;
          }
        }

        if (successCount % 10 === 0) {
          console.log(
            `📊 Progress: ${successCount} successful, ${errorCount} failed`
          );
        }
      } catch (error) {
        console.error(`❌ Error processing record:`, error.message);
        errorCount++;
      }
    }

    console.log(
      `\n🎉 Import complete: ${successCount} successful, ${errorCount} failed`
    );
    console.log(`📋 ID mappings saved to: ${ID_MAPPINGS_FILE}`);
  } catch (error) {
    console.error("💥 Import failed:", error);
    process.exit(1);
  }
}

// Helper functions to generate IDs for records that don't have them
function generateTagId(record) {
  return `tag_${record.tag.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

function generateLinkId(record) {
  return `link_${
    record.url ? record.url.slice(-10) : Math.random().toString(36).substr(2, 9)
  }`;
}

function generateLeseexemplarId(record) {
  return `lese_${record.userName}_${record.bookId}`.replace(
    /[^a-zA-Z0-9_]/g,
    "_"
  );
}

function generateListenId(record) {
  return `listen_${record.title}_${record.userId}`.replace(
    /[^a-zA-Z0-9_]/g,
    "_"
  );
}

function generateWarengruppenId(record) {
  return `waren_${record.title}_${record.userId}`.replace(
    /[^a-zA-Z0-9_]/g,
    "_"
  );
}

function generateEpubcfiId(record) {
  return `epub_${record.userId}_${record.book}`.replace(/[^a-zA-Z0-9_]/g, "_");
}

main();
