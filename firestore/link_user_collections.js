import fs from "fs";
import PocketBase from "pocketbase";

// Configuration
const POCKETBASE_URL = "https://service.serverfrank.de";
const ADMIN_EMAIL = "lennart.frank@posteo.de";
const ADMIN_PASSWORD = "8@JFAp3ggGePBcEP";

async function linkUserCollectionsToBooks() {
  try {
    const pb = new PocketBase(POCKETBASE_URL);

    // Admin authentication
    await pb
      .collection("_superusers")
      .authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log("✓ Authenticated as admin");

    // Load original data files to get book references
    const originalListen = JSON.parse(fs.readFileSync("./listen.json", "utf8"));
    const originalWarengruppen = JSON.parse(
      fs.readFileSync("./warengruppen.json", "utf8")
    );
    const originalEpubcfi = JSON.parse(
      fs.readFileSync("./epubcfi.json", "utf8")
    );

    console.log("✓ Loaded original data files");

    // Get all records from PocketBase
    const users = await pb.collection("users").getFullList();
    const libaryRecords = await pb.collection("libary").getFullList();
    const listenRecords = await pb.collection("listen").getFullList();
    const warengruppenRecords = await pb
      .collection("warengruppen")
      .getFullList();
    const epubcfiRecords = await pb.collection("epubcfi").getFullList();
    const books = await pb.collection("books").getFullList();

    console.log(
      `Found ${listenRecords.length} listen, ${warengruppenRecords.length} warengruppen, ${epubcfiRecords.length} epubcfi, ${books.length} books`
    );

    let stats = {
      listenToLibary: 0,
      listenToBooks: 0,
      warengruppenToLibary: 0,
      warengruppenToBooks: 0,
      epubcfiToLibary: 0,
      epubcfiToBooks: 0,
      errors: 0,
    };

    // Helper functions
    function findUserLibary(firebaseUserId) {
      const user = users.find((u) => u.uid === firebaseUserId);
      if (!user) return null;
      return libaryRecords.find((l) => user.libary === l.id);
    }

    function findBookByFirebaseId(firebaseBookId) {
      // Try multiple ways to find the book
      let book = books.find((book) => book.firebaseId === firebaseBookId);
      if (!book) {
        // Fallback: try uid field
        book = books.find((book) => book.uid === firebaseBookId);
      }
      if (!book) {
        // Fallback: try id field (though this shouldn't exist after import)
        book = books.find((book) => book.id === firebaseBookId);
      }
      return book;
    }

    // Debug: Check what firebaseId fields look like in books
    console.log(`\n🔍 === Book FirebaseId Debug ===`);
    const sampleBook = books[0];
    if (sampleBook) {
      console.log(`Sample book fields:`, {
        id: sampleBook.id,
        firebaseId: sampleBook.firebaseId,
        uid: sampleBook.uid,
        Titel: sampleBook.Titel,
      });
    }

    // Check how many books have firebaseId vs uid
    const booksWithFirebaseId = books.filter((b) => b.firebaseId).length;
    const booksWithUid = books.filter((b) => b.uid).length;
    console.log(
      `Books with firebaseId: ${booksWithFirebaseId}, with uid: ${booksWithUid}, total: ${books.length}`
    );

    // Show what Firebase book IDs we're looking for
    const sampleFirebaseBookIds = [
      ...new Set(originalListen.flatMap((l) => l.books || [])),
    ].slice(0, 3);
    console.log(
      `Sample Firebase book IDs we're looking for:`,
      sampleFirebaseBookIds
    );

    // 1. Process Listen records
    console.log("\n=== 1. Processing Listen Records ===");
    console.log(`Original listen data has ${originalListen.length} records`);
    console.log(`PocketBase listen records: ${listenRecords.length}`);

    // Debug: Show first few records
    if (listenRecords.length > 0) {
      console.log(`Sample PocketBase listen:`, {
        id: listenRecords[0].id,
        title: listenRecords[0].title,
        userId: listenRecords[0].userId,
        firebaseId: listenRecords[0].firebaseId,
      });
    }
    if (originalListen.length > 0) {
      console.log(`Sample original listen:`, {
        title: originalListen[0].title,
        userId: originalListen[0].userId,
        books: originalListen[0].books?.length || 0,
      });
    }

    for (const listen of listenRecords) {
      const firebaseUserId = listen.userId;
      console.log(
        `\nProcessing listen "${listen.title}" for user ${firebaseUserId}`
      );

      if (!firebaseUserId) {
        console.log(`⚠️  Listen record ${listen.id} has no userId`);
        continue;
      }

      // Find original data to get book references
      const originalData = originalListen.find(
        (l) => l.userId === firebaseUserId && l.title === listen.title
      );

      if (!originalData) {
        console.log(
          `✗ No matching original data found for listen "${listen.title}" user ${firebaseUserId}`
        );
        // Try alternative matching
        const altMatch = originalListen.find((l) => l.title === listen.title);
        if (altMatch) {
          console.log(
            `Found alternative match with different userId: ${altMatch.userId}`
          );
        }
        continue;
      } else {
        console.log(
          `✓ Found original data with ${originalData.books?.length || 0} books`
        );
      }

      // Link to user's libary
      const userLibary = findUserLibary(firebaseUserId);
      console.log(`User libary found: ${userLibary ? userLibary.id : "NO"}`);

      if (userLibary) {
        try {
          const currentListen = userLibary.Listen || [];
          if (!currentListen.includes(listen.id)) {
            await pb.collection("libary").update(userLibary.id, {
              Listen: [...currentListen, listen.id],
            });
            console.log(`✓ Linked listen "${listen.title}" to libary`);
            stats.listenToLibary++;
          } else {
            console.log(
              `ℹ️  Listen "${listen.title}" already linked to libary`
            );
          }
        } catch (error) {
          console.error(`✗ Failed to link listen to libary:`, error.message);
          stats.errors++;
        }
      } else {
        console.log(`✗ No libary found for user ${firebaseUserId}`);
      }

      // Link to books
      if (originalData && originalData.books && originalData.books.length > 0) {
        console.log(`Linking to ${originalData.books.length} books...`);
        const bookIds = [];
        for (const firebaseBookId of originalData.books) {
          const book = findBookByFirebaseId(firebaseBookId);
          if (book) {
            bookIds.push(book.id);
            console.log(
              `  Found book: ${book.Titel} (${firebaseBookId} → ${book.id})`
            );
          } else {
            console.log(`  Book not found: ${firebaseBookId}`);
          }
        }

        if (bookIds.length > 0) {
          try {
            await pb.collection("listen").update(listen.id, {
              books: bookIds,
            });
            console.log(
              `✓ Linked listen "${listen.title}" to ${bookIds.length} books`
            );
            stats.listenToBooks++;
          } catch (error) {
            console.error(`✗ Failed to link listen to books:`, error.message);
            stats.errors++;
          }
        } else {
          console.log(`✗ No valid books found for listen "${listen.title}"`);
        }
      } else {
        console.log(`ℹ️  No books to link for listen "${listen.title}"`);
      }
    }

    // 2. Process Warengruppen records
    console.log("\n=== 2. Processing Warengruppen Records ===");
    for (const warengruppe of warengruppenRecords) {
      const firebaseUserId = warengruppe.userId;
      if (!firebaseUserId) continue;

      // Find original data to get book references
      const originalData = originalWarengruppen.find(
        (w) => w.userId === firebaseUserId && w.title === warengruppe.title
      );

      // Link to user's libary
      const userLibary = findUserLibary(firebaseUserId);
      if (userLibary) {
        try {
          const currentWarengruppen = userLibary.Warengruppen || [];
          if (!currentWarengruppen.includes(warengruppe.id)) {
            await pb.collection("libary").update(userLibary.id, {
              Warengruppen: [...currentWarengruppen, warengruppe.id],
            });
            console.log(
              `✓ Linked warengruppe "${warengruppe.title}" to libary`
            );
            stats.warengruppenToLibary++;
          }
        } catch (error) {
          console.error(
            `✗ Failed to link warengruppe to libary:`,
            error.message
          );
          stats.errors++;
        }
      }

      // Link to books
      if (originalData && originalData.books && originalData.books.length > 0) {
        const bookIds = [];
        for (const firebaseBookId of originalData.books) {
          const book = findBookByFirebaseId(firebaseBookId);
          if (book) bookIds.push(book.id);
        }

        if (bookIds.length > 0) {
          try {
            await pb.collection("warengruppen").update(warengruppe.id, {
              books: bookIds,
            });
            console.log(
              `✓ Linked warengruppe "${warengruppe.title}" to ${bookIds.length} books`
            );
            stats.warengruppenToBooks++;
          } catch (error) {
            console.error(
              `✗ Failed to link warengruppe to books:`,
              error.message
            );
            stats.errors++;
          }
        }
      }
    }

    // 3. Process Epubcfi records
    console.log("\n=== 3. Processing Epubcfi Records ===");
    for (const epubcfi of epubcfiRecords) {
      const firebaseUserId = epubcfi.userId;
      if (!firebaseUserId) continue;

      // Find original data to get book reference
      const originalData = originalEpubcfi.find(
        (e) => e.userId === firebaseUserId && e.epubcfi === epubcfi.epubcfi
      );

      // Link to user's libary
      const userLibary = findUserLibary(firebaseUserId);
      if (userLibary) {
        try {
          const currentEpubcfi = userLibary.epubcfi || [];
          if (!currentEpubcfi.includes(epubcfi.id)) {
            await pb.collection("libary").update(userLibary.id, {
              epubcfi: [...currentEpubcfi, epubcfi.id],
            });
            console.log(`✓ Linked epubcfi ${epubcfi.id} to libary`);
            stats.epubcfiToLibary++;
          }
        } catch (error) {
          console.error(`✗ Failed to link epubcfi to libary:`, error.message);
          stats.errors++;
        }
      }

      // Link to book
      if (originalData && originalData.book) {
        const book = findBookByFirebaseId(originalData.book);
        if (book) {
          try {
            await pb.collection("epubcfi").update(epubcfi.id, {
              book: book.id,
            });
            console.log(
              `✓ Linked epubcfi ${epubcfi.id} to book "${book.Titel}"`
            );
            stats.epubcfiToBooks++;
          } catch (error) {
            console.error(`✗ Failed to link epubcfi to book:`, error.message);
            stats.errors++;
          }
        } else {
          console.log(
            `✗ Book not found for epubcfi (Firebase book ID: ${originalData.book})`
          );
        }
      }
    }

    console.log(`\n🎉 === User Collections Linking Complete ===`);
    console.log(`✓ Listen → Libary: ${stats.listenToLibary}`);
    console.log(`✓ Listen → Books: ${stats.listenToBooks}`);
    console.log(`✓ Warengruppen → Libary: ${stats.warengruppenToLibary}`);
    console.log(`✓ Warengruppen → Books: ${stats.warengruppenToBooks}`);
    console.log(`✓ Epubcfi → Libary: ${stats.epubcfiToLibary}`);
    console.log(`✓ Epubcfi → Books: ${stats.epubcfiToBooks}`);
    console.log(`❌ Errors: ${stats.errors}`);

    // Show verification samples
    console.log(`\n📊 === Verification Samples ===`);
    const sampleListen = listenRecords.find(
      (l) => l.books && l.books.length > 0
    );
    if (sampleListen) {
      console.log(
        `Listen "${sampleListen.title}" linked to ${sampleListen.books.length} books`
      );
    }

    const sampleWarengruppe = warengruppenRecords.find(
      (w) => w.books && w.books.length > 0
    );
    if (sampleWarengruppe) {
      console.log(
        `Warengruppe "${sampleWarengruppe.title}" linked to ${sampleWarengruppe.books.length} books`
      );
    }

    const sampleEpubcfi = epubcfiRecords.find((e) => e.book);
    if (sampleEpubcfi) {
      console.log(
        `Epubcfi ${sampleEpubcfi.id} linked to book ${sampleEpubcfi.book}`
      );
    }
  } catch (error) {
    console.error("💥 Error during user collections linking:", error);
  }
}

linkUserCollectionsToBooks();
