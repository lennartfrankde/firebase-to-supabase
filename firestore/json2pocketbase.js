import fs from "fs";
import PocketBase from "pocketbase";
import { randomBytes } from "crypto";
import path from "path";

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error(
    "Usage: node json2pocketbase.js <jsonFile> <pocketbaseCollection>"
  );
  process.exit(1);
}

const jsonFilePath = args[0];
const collectionName = args[1];

// Configuration
const POCKETBASE_URL = "https://service.serverfrank.de"; // Change to your PocketBase URL
const ADMIN_EMAIL = "lennart.frank@posteo.de"; // Change to your admin email
const ADMIN_PASSWORD = "8@JFAp3ggGePBcEP"; // Change to your admin password

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

        if (collectionName === "userData") {
          // For userData, use the record but remove ID to let PocketBase auto-generate
          recordData = { ...record };
          const originalFirebaseId = record.id; // Store original Firebase ID
          delete recordData.id; // Let PocketBase generate the ID
          recordData.firebaseId = originalFirebaseId; // Store Firebase ID in the record
        } else if (collectionName === "libary") {
          // For libary, use the record but remove ID to let PocketBase auto-generate
          recordData = { ...record };
          delete recordData.id; // Let PocketBase generate the ID
          // Don't store Firebase ID since it's not in the schema
        } else if (collectionName === "books") {
          // Handle books with relations
          recordData = { ...record };

          // Remove ID to let PocketBase auto-generate (ID has 15 char limit)
          delete recordData.id;

          // Clear file fields that contain Firebase Storage URLs
          recordData.Cover = "";
          recordData.LeseprobeFile = "";
          recordData.CoverFileName = "";
          recordData.LeseprobeFileName = "";
          recordData.LeseexemplarFileName = "";

          // Handle Schlagworte (tags) relations - string[] type
          if (record.Schlagworte && Array.isArray(record.Schlagworte)) {
            recordData.Schlagworte = []; // Will be populated with relation IDs, but for now empty since tags are created separately
          }

          // Handle Links relations - string[] type
          if (record.Links && Array.isArray(record.Links)) {
            recordData.Links = []; // Will be populated with relation IDs, but for now empty since links are created separately
          }

          // Handle Leseexemplar relations - string[] type (references to leseexemplar records)
          if (record.Leseexemplar && Array.isArray(record.Leseexemplar)) {
            recordData.Leseexemplar = []; // Will be populated when leseexemplar records are created
          }

          // Handle notification arrays - clear them since user IDs might not exist yet
          recordData.benachrichtigungLeseexemplar = [];
          recordData.benachrichtigungLeseprobe = [];
        } else if (collectionName === "leseexemplar") {
          recordData = { ...record };
          // Clear relation fields since referenced records might not exist yet
          recordData.userData = ""; // Clear userData relation
          recordData.bookId = ""; // Clear book relation
          recordData.userId = ""; // Clear user relation
          recordData.verlagId = ""; // Clear verlag relation if it exists
        } else if (collectionName === "tags") {
          recordData = { ...record };
          // Clear books relation since books don't exist yet
          if (record.books && Array.isArray(record.books)) {
            recordData.books = [];
          }
        } else if (collectionName === "links") {
          recordData = { ...record };
          // No relations to handle for links
        } else if (collectionName === "users") {
          recordData = { ...record };
          // Handle libary relation - string type (references libary)
          if (record.libary && typeof record.libary === "string") {
            recordData.libary = record.libary;
          }
          // Handle userData relation - string type (references userData)
          if (record.userData && typeof record.userData === "string") {
            recordData.userData = record.userData;
          }
        } else if (collectionName === "libary") {
          recordData = { ...record };
          const originalFirebaseId = record.id; // Store original Firebase ID
          delete recordData.id; // Let PocketBase generate the ID
          recordData.firebaseId = originalFirebaseId; // Store Firebase ID in the record
          // Clear all relation arrays since referenced records don't exist yet
          if (record.Leseexemplare && Array.isArray(record.Leseexemplare)) {
            recordData.Leseexemplare = [];
          }
          if (record.books && Array.isArray(record.books)) {
            recordData.books = [];
          }
          if (record.favoriten && Array.isArray(record.favoriten)) {
            recordData.favoriten = [];
          }
          if (record.gelesen && Array.isArray(record.gelesen)) {
            recordData.gelesen = [];
          }
          if (record.Listen && Array.isArray(record.Listen)) {
            recordData.Listen = [];
          }
          if (record.Warengruppen && Array.isArray(record.Warengruppen)) {
            recordData.Warengruppen = [];
          }
          if (record.epubcfi && Array.isArray(record.epubcfi)) {
            recordData.epubcfi = [];
          }
        } else if (collectionName === "listen") {
          recordData = { ...record };
          // Clear books relation since books don't exist yet
          if (record.books && Array.isArray(record.books)) {
            recordData.books = [];
          }
        } else if (collectionName === "warengruppen") {
          recordData = { ...record };
          // Clear books relation since books don't exist yet
          if (record.books && Array.isArray(record.books)) {
            recordData.books = [];
          }
        } else if (collectionName === "epubcfi") {
          recordData = { ...record };
          // Clear relations since books and users don't have matching IDs yet
          delete recordData.book; // Clear book relation
          recordData.userId = ""; // Clear user relation if it exists
        } else {
          recordData = record;
        }

        // Create record in PocketBase
        if (collectionName !== "users") {
          try {
            const createdRecord = await pb
              .collection(collectionName)
              .create(recordData);

            console.log(
              `Created ${collectionName} record: ${createdRecord.id}`
            );

            // Handle special post-creation updates
            if (collectionName === "userData") {
              // Since we can't use matching IDs, we'll skip automatic linking for now
              // You'll need to link userData manually or create a separate linking script
              console.log(
                `Created userData record: ${createdRecord.id} (no automatic linking)`
              );
            }

            if (collectionName === "libary") {
              // Since we can't use matching IDs, we'll skip automatic linking for now
              // You'll need to link libary manually or create a separate linking script
              console.log(
                `Created libary record: ${createdRecord.id} (no automatic linking)`
              );
            }
          } catch (createError) {
            console.error(
              `Failed to create ${collectionName} record:`,
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
          // Handle users collection - check if user already exists by uid
          try {
            const existingUsers = await pb.collection("users").getFullList();
            const existingUser = existingUsers.find(
              (u) => u.uid === recordData.uid
            );

            if (existingUser) {
              // Update existing user - remove fields that might cause permission issues during import
              const updateData = { ...recordData };
              delete updateData.id; // Don't update the ID
              delete updateData.password; // Don't update password during data migration
              delete updateData.passwordConfirm; // Don't update password during data migration
              delete updateData.tokenKey; // Don't update tokenKey

              await pb.collection("users").update(existingUser.id, updateData);
              console.log(
                `Updated existing user: ${recordData.uid || recordData.email}`
              );
            } else {
              // Create new user
              await pb.collection("users").create(recordData);
              console.log(
                `Created new user: ${recordData.uid || recordData.email}`
              );
            }
          } catch (userError) {
            console.error(
              `Error handling user ${recordData.uid || recordData.email}:`,
              userError.message
            );
            console.error(`User data:`, JSON.stringify(recordData, null, 2));
            // Don't throw error, just count it and continue
            errorCount++;
            continue;
          }
        }

        successCount++;

        if (successCount % 10 === 0) {
          console.log(`Imported ${successCount} records...`);
        }
      } catch (error) {
        console.error(
          `Error importing record: ${JSON.stringify(record, null, 2)}`,
          error.message
        );
        errorCount++;
      }
    }

    console.log(
      `Import complete: ${successCount} successful, ${errorCount} failed`
    );
  } catch (error) {
    console.error("Import failed:", error);
    process.exit(1);
  }
}

main();
