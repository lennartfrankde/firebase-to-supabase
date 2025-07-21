import fs from "fs";
import PocketBase from "pocketbase";

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
  throw new Error("ID mappings file not found. Please run imports first.");
}

async function linkListenAndWarengruppen() {
  try {
    const pb = new PocketBase(POCKETBASE_URL);

    // Admin authentication
    await pb
      .collection("_superusers")
      .authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log("✓ Authenticated as admin");

    // Load ID mappings
    const mappings = loadIdMappings();
    console.log("✓ Loaded ID mappings");

    // Get all users and libary records from PocketBase
    const users = await pb.collection("users").getFullList();
    const libaryRecords = await pb.collection("libary").getFullList();
    const listenRecords = await pb.collection("listen").getFullList();
    const warengruppenRecords = await pb
      .collection("warengruppen")
      .getFullList();

    console.log(
      `Found ${users.length} users, ${libaryRecords.length} libary, ${listenRecords.length} listen, ${warengruppenRecords.length} warengruppen`
    );

    let listenLinked = 0;
    let warengruppenLinked = 0;
    let errors = 0;

    // Helper function to find user's libary
    function findUserLibary(firebaseUserId) {
      // Find PocketBase user by Firebase UID
      const user = users.find((u) => u.uid === firebaseUserId);
      if (!user) return null;

      // Find libary linked to this user
      const libary = libaryRecords.find((l) => user.libary === l.id);
      return libary;
    }

    // 1. Process Listen records
    console.log("\n=== Linking Listen Records to Libary ===");
    for (const listen of listenRecords) {
      // Get the original Firebase userId from the listen record
      const firebaseUserId = listen.userId;

      if (!firebaseUserId) {
        console.log(`⚠️  Listen record ${listen.id} has no userId`);
        continue;
      }

      // Find the user's libary
      const userLibary = findUserLibary(firebaseUserId);

      if (userLibary) {
        try {
          // Get current Listen array from libary
          const currentListen = userLibary.Listen || [];

          // Add this listen record if not already linked
          if (!currentListen.includes(listen.id)) {
            const updatedListen = [...currentListen, listen.id];

            await pb.collection("libary").update(userLibary.id, {
              Listen: updatedListen,
            });

            console.log(
              `✓ Linked listen "${listen.title}" to user ${firebaseUserId}'s libary`
            );
            listenLinked++;
          } else {
            console.log(
              `ℹ️  Listen "${listen.title}" already linked to libary`
            );
          }
        } catch (error) {
          console.error(
            `✗ Failed to link listen "${listen.title}":`,
            error.message
          );
          errors++;
        }
      } else {
        console.log(
          `✗ No libary found for user ${firebaseUserId} (listen: "${listen.title}")`
        );
        errors++;
      }
    }

    // 2. Process Warengruppen records
    console.log("\n=== Linking Warengruppen Records to Libary ===");
    for (const warengruppe of warengruppenRecords) {
      // Get the original Firebase userId from the warengruppe record
      const firebaseUserId = warengruppe.userId;

      if (!firebaseUserId) {
        console.log(`⚠️  Warengruppe record ${warengruppe.id} has no userId`);
        continue;
      }

      // Find the user's libary
      const userLibary = findUserLibary(firebaseUserId);

      if (userLibary) {
        try {
          // Get current Warengruppen array from libary
          const currentWarengruppen = userLibary.Warengruppen || [];

          // Add this warengruppe record if not already linked
          if (!currentWarengruppen.includes(warengruppe.id)) {
            const updatedWarengruppen = [
              ...currentWarengruppen,
              warengruppe.id,
            ];

            await pb.collection("libary").update(userLibary.id, {
              Warengruppen: updatedWarengruppen,
            });

            console.log(
              `✓ Linked warengruppe "${warengruppe.title}" to user ${firebaseUserId}'s libary`
            );
            warengruppenLinked++;
          } else {
            console.log(
              `ℹ️  Warengruppe "${warengruppe.title}" already linked to libary`
            );
          }
        } catch (error) {
          console.error(
            `✗ Failed to link warengruppe "${warengruppe.title}":`,
            error.message
          );
          errors++;
        }
      } else {
        console.log(
          `✗ No libary found for user ${firebaseUserId} (warengruppe: "${warengruppe.title}")`
        );
        errors++;
      }
    }

    console.log(`\n🎉 === Listen & Warengruppen Linking Complete ===`);
    console.log(`✓ Listen records linked: ${listenLinked}`);
    console.log(`✓ Warengruppen records linked: ${warengruppenLinked}`);
    console.log(`❌ Errors: ${errors}`);

    // Verification: Show some examples
    console.log(`\n📊 === Verification Sample ===`);
    const sampleLibary = libaryRecords.find(
      (l) =>
        (l.Listen && l.Listen.length > 0) ||
        (l.Warengruppen && l.Warengruppen.length > 0)
    );
    if (sampleLibary) {
      console.log(`Sample libary ${sampleLibary.id}:`);
      console.log(`  - Listen: ${sampleLibary.Listen?.length || 0} records`);
      console.log(
        `  - Warengruppen: ${sampleLibary.Warengruppen?.length || 0} records`
      );
    }
  } catch (error) {
    console.error("💥 Error during listen/warengruppen linking:", error);
  }
}

linkListenAndWarengruppen();
