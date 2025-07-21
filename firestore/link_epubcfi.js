import fs from "fs";
import PocketBase from "pocketbase";

// Configuration
const POCKETBASE_URL = "https://service.serverfrank.de";
const ADMIN_EMAIL = "lennart.frank@posteo.de";
const ADMIN_PASSWORD = "8@JFAp3ggGePBcEP";

async function linkEpubcfi() {
  try {
    const pb = new PocketBase(POCKETBASE_URL);

    // Admin authentication
    await pb
      .collection("_superusers")
      .authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log("✓ Authenticated as admin");

    // Get all records from PocketBase
    const users = await pb.collection("users").getFullList();
    const libaryRecords = await pb.collection("libary").getFullList();
    const epubcfiRecords = await pb.collection("epubcfi").getFullList();
    const books = await pb.collection("books").getFullList();

    console.log(
      `Found ${users.length} users, ${libaryRecords.length} libary, ${epubcfiRecords.length} epubcfi, ${books.length} books`
    );

    let epubcfiLinked = 0;
    let epubcfiBookLinked = 0;
    let errors = 0;

    // Helper function to find user's libary
    function findUserLibary(firebaseUserId) {
      const user = users.find((u) => u.uid === firebaseUserId);
      if (!user) return null;

      const libary = libaryRecords.find((l) => user.libary === l.id);
      return libary;
    }

    // Helper function to find book by Firebase ID
    function findBookByFirebaseId(firebaseBookId) {
      return books.find((book) => book.firebaseId === firebaseBookId);
    }

    console.log("\n=== Linking Epubcfi Records ===");

    for (const epubcfi of epubcfiRecords) {
      const firebaseUserId = epubcfi.userId;

      if (!firebaseUserId) {
        console.log(`⚠️  Epubcfi record ${epubcfi.id} has no userId`);
        continue;
      }

      // 1. Link epubcfi to user's libary
      const userLibary = findUserLibary(firebaseUserId);

      if (userLibary) {
        try {
          const currentEpubcfi = userLibary.epubcfi || [];

          if (!currentEpubcfi.includes(epubcfi.id)) {
            const updatedEpubcfi = [...currentEpubcfi, epubcfi.id];

            await pb.collection("libary").update(userLibary.id, {
              epubcfi: updatedEpubcfi,
            });

            console.log(
              `✓ Linked epubcfi ${epubcfi.id} to user ${firebaseUserId}'s libary`
            );
            epubcfiLinked++;
          }
        } catch (error) {
          console.error(`✗ Failed to link epubcfi to libary:`, error.message);
          errors++;
        }
      } else {
        console.log(
          `✗ No libary found for user ${firebaseUserId} (epubcfi: ${epubcfi.id})`
        );
        errors++;
      }

      // 2. Link epubcfi to book (if we have the book field in the original data)
      // Read original epubcfi data to get book references
      const originalEpubcfi = JSON.parse(
        fs.readFileSync("./epubcfi.json", "utf8")
      );
      const originalEpubcfiRecord = originalEpubcfi.find(
        (e) => e.userId === firebaseUserId && e.epubcfi === epubcfi.epubcfi
      );

      if (originalEpubcfiRecord && originalEpubcfiRecord.book) {
        const book = findBookByFirebaseId(originalEpubcfiRecord.book);

        if (book) {
          try {
            await pb.collection("epubcfi").update(epubcfi.id, {
              book: book.id,
            });

            console.log(
              `✓ Linked epubcfi ${epubcfi.id} to book "${book.Titel}"`
            );
            epubcfiBookLinked++;
          } catch (error) {
            console.error(`✗ Failed to link epubcfi to book:`, error.message);
            errors++;
          }
        } else {
          console.log(
            `✗ Book not found for epubcfi (Firebase book ID: ${originalEpubcfiRecord.book})`
          );
        }
      }
    }

    console.log(`\n🎉 === Epubcfi Linking Complete ===`);
    console.log(`✓ Epubcfi linked to libary: ${epubcfiLinked}`);
    console.log(`✓ Epubcfi linked to books: ${epubcfiBookLinked}`);
    console.log(`❌ Errors: ${errors}`);

    // Verification
    const sampleLibary = libaryRecords.find(
      (l) => l.epubcfi && l.epubcfi.length > 0
    );
    if (sampleLibary) {
      console.log(
        `\n📊 Sample libary ${sampleLibary.id} has ${sampleLibary.epubcfi.length} epubcfi records`
      );
    }
  } catch (error) {
    console.error("💥 Error during epubcfi linking:", error);
  }
}

linkEpubcfi();
