import fs from "fs";
import PocketBase from "pocketbase";

// Initialize PocketBase client
const pb = new PocketBase("https://service.serverfrank.de"); // Replace with your PocketBase URL

async function main() {
  try {
    // Login as admin
    await pb.admins.authWithPassword(
      "lennart.frank@posteo.de",
      "8@JFAp3ggGePBcEP"
    );

    // Read the JSON file
    const rawData = fs.readFileSync("./dump_test.json", "utf-8");
    const users = JSON.parse(rawData);

    console.log(`Found ${users.length} users to import`);

    // Import each user
    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        let userData = {};
        if (user.providerData.providerId === "password") {
          // Prepare user data for PocketBase format
          userData = {
            email: user.email,
            username: user.email.split("@")[0], // Creating username from email
            emailVisibility: true,
            oldpwhash: user.passwordHash, // Assuming password is stored in plain text
            oldpwsalt: user.passwordSalt, // Assuming no salt is used
            verified: user.emailVerified,
            name: user.displayName || "",
            avatar: user.photoURL || "",
            disabled: user.disabled || false,
          };
        } else {
          userData = {
            email: user.email,
            username: user.email.split("@")[0], // Creating username from email
            emailVisibility: true,
            verified: user.emailVerified,
            name: user.displayName || "",
            avatar: user.photoURL || "",
            disabled: user.disabled || false,
            oauthid: user.providerData.uid, // OAuth ID
            oauthprovider: user.providerData.providerId, // OAuth provider
          };
        }

        // Create the user in PocketBase
        const record = await pb.collection("users").create(userData);
        console.log(`Imported user: ${user.email}`);
        successCount++;
      } catch (error) {
        console.error(`Failed to import user ${user.email}:`, error);
        errorCount++;
      }
    }

    console.log(
      `Import completed: ${successCount} users imported, ${errorCount} failed`
    );
  } catch (error) {
    console.error("Error during import:", error);
  }
}

main().catch(console.error);
