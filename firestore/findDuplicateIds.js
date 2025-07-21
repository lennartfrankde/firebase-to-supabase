const fs = require("fs"); // Import the file system module

function findDuplicateFirestoreIds(data) {
  const seenIds = new Set();
  const duplicateIds = new Set(); // Use a Set to store unique duplicate IDs

  for (const item of data) {
    const firestoreId = item.firestore_id;
    if (firestoreId) {
      // Ensure the firestore_id exists
      if (seenIds.has(firestoreId)) {
        duplicateIds.add(firestoreId); // Add to duplicates if already seen
      } else {
        seenIds.add(firestoreId); // Add to seen if not yet encountered
      }
    }
  }

  return Array.from(duplicateIds); // Convert Set back to Array for output
}

const filePath = "./user_libary.json"; // Get the file path from command line arguments

try {
  const fileContent = fs.readFileSync(filePath, "utf8"); // Read the file content as a string
  const userData = JSON.parse(fileContent); // Parse the JSON string into a JavaScript array

  const duplicates = findDuplicateFirestoreIds(userData);

  if (duplicates.length > 0) {
    console.log("Found duplicate firestore_ids:");
    console.log(duplicates);
  } else {
    console.log("No duplicate firestore_ids found.");
  }
} catch (error) {
  console.error("Error processing file:");
  if (error.code === "ENOENT") {
    console.error(`File not found at: ${filePath}`);
  } else if (error instanceof SyntaxError) {
    console.error(
      `Invalid JSON in file: ${filePath}. Please check its format.`
    );
  } else {
    console.error(error.message);
  }
}
