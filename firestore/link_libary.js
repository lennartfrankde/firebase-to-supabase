import fs from "fs";
import PocketBase from "pocketbase";

// Configuration
const POCKETBASE_URL = "https://service.serverfrank.de";
const ADMIN_EMAIL = "lennart.frank@posteo.de";
const ADMIN_PASSWORD = "8@JFAp3ggGePBcEP";

async function linkLibary() {
  try {
    const pb = new PocketBase(POCKETBASE_URL);

    // Admin authentication
    await pb
      .collection("_superusers")
      .authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log("✓ Authenticated as admin");

    // Read the original user_libary.json to get the mapping
    const originalLibaryData = JSON.parse(
      fs.readFileSync("./user_libary.json", "utf8")
    );
    console.log(`Loaded ${originalLibaryData.length} original libary records`);

    // Get all users and libary records from PocketBase
    const users = await pb.collection("users").getFullList();
    const libaryRecords = await pb.collection("libary").getFullList();

    console.log(
      `Found ${users.length} users and ${libaryRecords.length} libary records in PocketBase`
    );

    let linkedCount = 0;
    let notFoundCount = 0;

    // Link libary records to users based on Firebase ID
    for (const originalRecord of originalLibaryData) {
      const originalFirebaseId = originalRecord.id;

      // Find the corresponding user by matching the Firebase ID (stored in uid field)
      const matchingUser = users.find(
        (user) => user.uid === originalFirebaseId
      );

      if (matchingUser) {
        // For libary, we need to match by the array contents since we can't use ID anymore
        // We'll match by the combination of array lengths and some content
        const matchingLibary = libaryRecords.find((libary) => {
          // Match by array lengths as a simple heuristic
          return (
            libary.books?.length === originalRecord.books?.length &&
            libary.favoriten?.length === originalRecord.favoriten?.length &&
            libary.gelesen?.length === originalRecord.gelesen?.length &&
            libary.Leseexemplare?.length ===
              originalRecord.Leseexemplare?.length
          );
        });

        if (matchingLibary) {
          try {
            // Link the libary to the user
            await pb.collection("users").update(matchingUser.id, {
              libary: matchingLibary.id,
            });

            console.log(
              `✓ Linked user ${matchingUser.uid} to libary ${matchingLibary.id}`
            );
            linkedCount++;

            // Remove the linked libary from the array to avoid duplicate matches
            const index = libaryRecords.indexOf(matchingLibary);
            if (index > -1) {
              libaryRecords.splice(index, 1);
            }
          } catch (error) {
            console.error(
              `✗ Failed to link user ${matchingUser.uid} to libary:`,
              error.message
            );
          }
        } else {
          console.log(
            `✗ Could not find matching libary for user ${originalFirebaseId}`
          );
          notFoundCount++;
        }
      } else {
        console.log(
          `✗ Could not find user with Firebase ID: ${originalFirebaseId}`
        );
        notFoundCount++;
      }
    }

    console.log(`\n=== Libary Linking Results ===`);
    console.log(`✓ Successfully linked: ${linkedCount}`);
    console.log(`✗ Not found/failed: ${notFoundCount}`);
    console.log(`Total processed: ${originalLibaryData.length}`);
  } catch (error) {
    console.error("Error during libary linking:", error);
  }
}

linkLibary();
