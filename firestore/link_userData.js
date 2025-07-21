import fs from "fs";
import PocketBase from "pocketbase";

// Configuration
const POCKETBASE_URL = "https://service.serverfrank.de";
const ADMIN_EMAIL = "lennart.frank@posteo.de";
const ADMIN_PASSWORD = "8@JFAp3ggGePBcEP";

async function linkUserData() {
  try {
    const pb = new PocketBase(POCKETBASE_URL);

    // Admin authentication
    await pb
      .collection("_superusers")
      .authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log("✓ Authenticated as admin");

    // Read the original userData.json to get the mapping
    const originalUserData = JSON.parse(
      fs.readFileSync("./userData.json", "utf8")
    );
    console.log(`Loaded ${originalUserData.length} original userData records`);

    // Get all users and userData from PocketBase
    const users = await pb.collection("users").getFullList();
    const userDataRecords = await pb.collection("userData").getFullList();

    console.log(
      `Found ${users.length} users and ${userDataRecords.length} userData records in PocketBase`
    );

    let linkedCount = 0;
    let notFoundCount = 0;

    // Create a mapping based on userName field (since that's likely unique)
    for (const originalRecord of originalUserData) {
      const originalFirebaseId = originalRecord.id;
      const userName = originalRecord.userName;

      // Find the corresponding user by matching the Firebase ID (stored in uid field)
      const matchingUser = users.find(
        (user) => user.uid === originalFirebaseId
      );

      if (matchingUser) {
        // Find the userData record by userName (since we can't match by ID anymore)
        const matchingUserData = userDataRecords.find(
          (userData) =>
            userData.userName === userName &&
            userData.verlagsname === originalRecord.verlagsname &&
            userData.buchhandlung === originalRecord.buchhandlung
        );

        if (matchingUserData) {
          try {
            // Link the userData to the user
            await pb.collection("users").update(matchingUser.id, {
              userData: matchingUserData.id,
            });

            console.log(
              `✓ Linked user ${matchingUser.uid} to userData ${matchingUserData.id} (${userName})`
            );
            linkedCount++;
          } catch (error) {
            console.error(
              `✗ Failed to link user ${matchingUser.uid} to userData:`,
              error.message
            );
          }
        } else {
          console.log(
            `✗ Could not find matching userData for user ${userName} (${originalFirebaseId})`
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

    console.log(`\n=== Linking Results ===`);
    console.log(`✓ Successfully linked: ${linkedCount}`);
    console.log(`✗ Not found/failed: ${notFoundCount}`);
    console.log(`Total processed: ${originalUserData.length}`);
  } catch (error) {
    console.error("Error during linking:", error);
  }
}

linkUserData();
