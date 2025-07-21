import PocketBase from "pocketbase";

// Configuration
const POCKETBASE_URL = "https://service.serverfrank.de";
const ADMIN_EMAIL = "lennart.frank@posteo.de";
const ADMIN_PASSWORD = "8@JFAp3ggGePBcEP";

async function testUserData() {
  try {
    const pb = new PocketBase(POCKETBASE_URL);

    // Admin authentication
    await pb
      .collection("_superusers")
      .authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log("✓ Authenticated as admin");

    // Test creating a simple userData record
    const testUserData = {
      id: "test123",
      userName: "Test User",
      buchhaltung: "",
      kontakt: "",
      verlagId: "",
      verlagsname: "",
      buchhandlung: "Test Bookstore",
      arbeit: "Test Job",
      verkehr: "12345",
      homepage: "test.com",
      benachrichtigung: "always",
      telefon: "",
      land: "Germany",
      ort: "Berlin",
      plz: "12043",
      num: "66",
      street: "Test Street",
      created: new Date(),
      updated: new Date(),
    };

    console.log("Attempting to create test userData record...");
    const result = await pb.collection("userData").create(testUserData);
    console.log("✓ Successfully created userData:", result.id);

    // Clean up - delete the test record
    await pb.collection("userData").delete(result.id);
    console.log("✓ Cleaned up test record");
  } catch (error) {
    console.error("❌ Error testing userData:", error.message);
    if (error.data) {
      console.error("Validation errors:", JSON.stringify(error.data, null, 2));
    }
  }
}

testUserData();
