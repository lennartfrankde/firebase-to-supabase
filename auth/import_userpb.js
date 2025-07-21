import { randomBytes } from "crypto";
import fs from "fs";
import PocketBase from "pocketbase";

// Initialize PocketBase client
const pb = new PocketBase("https://service.serverfrank.de"); // Replace with your PocketBase URL

async function main() {
  try {
    // Login as admin
    await pb
      .collection("_superusers")
      .authWithPassword("lennart.frank@posteo.de", "8@JFAp3ggGePBcEP");

    // Read the JSON file (use firebase_auth_users.json as created by the export script)
    const rawData = fs.readFileSync("./firebase_auth_users.json", "utf-8");
    const users = JSON.parse(rawData);

    console.log(`Found ${users.length} users to import`);

    // Import each user
    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        let userData = {};

        // Check if user has password provider or OAuth provider
        const hasPasswordProvider = user.providerData?.some(
          (p) => p.providerId === "password"
        );

        if (hasPasswordProvider) {
          // Handle password-based authentication users
          const password = randomBytes(16).toString("hex"); // Generate a random password
          userData = {
            email: user.email || "",
            emailVisibility: true,
            verified: user.emailVerified || false,
            name: user.displayName || "",
            avatar: user.photoURL || "",
            disabled: user.disabled || false,
            password: password,
            passwordConfirm: password,
            uid: user.uid || "",
            // Store original password hash for later migration if needed
            oldpwhash: user.passwordHash || "",
            oldpwsalt: user.passwordSalt || "",
            role: "buchhaendler", // Default role
            newsletter: false,
            steuer: "",
            unlocked: false,
            blocked: false,
            libary: "", // Will be populated later
            userData: "", // Will be populated later
            oauthid: "",
            oauthusername: "",
            oauthprovider: "",
            stripe: "",
          };
        } else {
          // Handle OAuth users
          const provider =
            user.providerData && user.providerData.length > 0
              ? user.providerData[0]
              : {};
          const password = randomBytes(16).toString("hex"); // Generate a random password

          userData = {
            email: user.email || "",
            emailVisibility: true,
            verified: user.emailVerified || false,
            name: user.displayName || "",
            avatar: user.photoURL || "",
            disabled: user.disabled || false,
            password: password,
            passwordConfirm: password,
            uid: user.uid || "",
            role: "buchhaendler", // Default role
            newsletter: false,
            steuer: "",
            unlocked: false,
            blocked: false,
            libary: "", // Will be populated later
            userData: "", // Will be populated later
            oauthid: provider.uid || "",
            oauthusername: provider.displayName || "",
            oauthprovider: provider.providerId || "",
            stripe: "",
          };
        }

        // Create the user in PocketBase
        await pb.collection("users").create(userData);
        console.log(`Imported user: ${user.email || user.uid}`);
        successCount++;
      } catch (error) {
        console.error(
          `Failed to import user ${user.email || user.uid}:`,
          error.message
        );
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
