import fs from "fs";
import PocketBase from "pocketbase";

// Configuration
const POCKETBASE_URL = "https://service.serverfrank.de";
const ADMIN_EMAIL = "lennart.frank@posteo.de";
const ADMIN_PASSWORD = "8@JFAp3ggGePBcEP";

async function linkLibaryRelations() {
  try {
    const pb = new PocketBase(POCKETBASE_URL);

    // Admin authentication
    await pb
      .collection("_superusers")
      .authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log("✓ Authenticated as admin");

    // Read original data files
    const originalLibary = JSON.parse(
      fs.readFileSync("./user_libary.json", "utf8")
    );
    const originalBooks = JSON.parse(fs.readFileSync("./books.json", "utf8"));
    const originalWarengruppen = JSON.parse(
      fs.readFileSync("./warengruppen.json", "utf8")
    );
    const originalListen = JSON.parse(fs.readFileSync("./listen.json", "utf8"));
    const originalEpubcfi = JSON.parse(
      fs.readFileSync("./epubcfi.json", "utf8")
    );

    console.log(
      `Loaded original data: ${originalLibary.length} libary, ${originalBooks.length} books`
    );

    // Get all records from PocketBase
    const users = await pb.collection("users").getFullList();
    const libary = await pb.collection("libary").getFullList();
    const books = await pb.collection("books").getFullList();
    const warengruppen = await pb.collection("warengruppen").getFullList();
    const listen = await pb.collection("listen").getFullList();
    const epubcfi = await pb.collection("epubcfi").getFullList();

    console.log(
      `Found ${libary.length} libary, ${books.length} books, ${warengruppen.length} warengruppen, ${listen.length} listen, ${epubcfi.length} epubcfi in PocketBase`
    );

    let libaryBooksLinked = 0;
    let libaryWarengruppenLinked = 0;
    let libaryListenLinked = 0;
    let libaryEpubcfiLinked = 0;

    // Helper function to find PocketBase book by Firebase ID
    function findPocketBaseBook(firebaseBookId) {
      const originalBook = originalBooks.find(
        (book) => (book.uid || book.id) === firebaseBookId
      );

      if (originalBook) {
        return books.find(
          (book) =>
            book.Titel === originalBook.Titel &&
            book.Autor === originalBook.Autor &&
            book.ISBN === originalBook.ISBN
        );
      }
      return null;
    }

    // Process each original libary record
    for (const originalLib of originalLibary) {
      const firebaseUserId = originalLib.id;

      // Find corresponding user
      const user = users.find((u) => u.uid === firebaseUserId);
      if (!user) {
        console.log(`User not found for Firebase ID: ${firebaseUserId}`);
        continue;
      }

      // Find corresponding libary record (should be linked to this user)
      let pbLibary = libary.find((lib) => user.libary === lib.id);

      if (!pbLibary) {
        console.log(
          `Libary not found for user: ${firebaseUserId} (user.libary = ${user.libary})`
        );
        continue;
      }

      // 1. Link books arrays (books, favoriten, gelesen)
      const bookArrays = ["books", "favoriten", "gelesen"];
      for (const arrayName of bookArrays) {
        if (originalLib[arrayName] && originalLib[arrayName].length > 0) {
          const matchingBookIds = [];

          for (const firebaseBookId of originalLib[arrayName]) {
            const pbBook = findPocketBaseBook(firebaseBookId);
            if (pbBook) {
              matchingBookIds.push(pbBook.id);
            }
          }

          if (matchingBookIds.length > 0) {
            try {
              await pb.collection("libary").update(pbLibary.id, {
                [arrayName]: matchingBookIds,
              });
              console.log(
                `✓ Linked libary ${arrayName} to ${matchingBookIds.length} books`
              );
              libaryBooksLinked++;
            } catch (error) {
              console.error(
                `✗ Failed to link libary ${arrayName}:`,
                error.message
              );
            }
          }
        }
      }

      // 2. Link Warengruppen
      if (originalLib.Warengruppen && originalLib.Warengruppen.length > 0) {
        const matchingWarengruppenIds = [];

        for (const warengruppenId of originalLib.Warengruppen) {
          // Find warengruppen by userId
          const originalWarengruppe = originalWarengruppen.find(
            (w) => w.userId === firebaseUserId
          );

          if (originalWarengruppe) {
            const pbWarengruppe = warengruppen.find(
              (w) =>
                w.title === originalWarengruppe.title &&
                w.userId === originalWarengruppe.userId
            );
            if (pbWarengruppe) {
              matchingWarengruppenIds.push(pbWarengruppe.id);
            }
          }
        }

        if (matchingWarengruppenIds.length > 0) {
          try {
            await pb.collection("libary").update(pbLibary.id, {
              Warengruppen: matchingWarengruppenIds,
            });
            console.log(
              `✓ Linked libary to ${matchingWarengruppenIds.length} warengruppen`
            );
            libaryWarengruppenLinked++;
          } catch (error) {
            console.error(
              `✗ Failed to link libary warengruppen:`,
              error.message
            );
          }
        }
      }

      // 3. Link Listen
      if (originalLib.Listen && originalLib.Listen.length > 0) {
        const matchingListenIds = [];

        for (const listenId of originalLib.Listen) {
          const originalListe = originalListen.find(
            (l) => l.userId === firebaseUserId
          );

          if (originalListe) {
            const pbListe = listen.find(
              (l) =>
                l.title === originalListe.title &&
                l.userId === originalListe.userId
            );
            if (pbListe) {
              matchingListenIds.push(pbListe.id);
            }
          }
        }

        if (matchingListenIds.length > 0) {
          try {
            await pb.collection("libary").update(pbLibary.id, {
              Listen: matchingListenIds,
            });
            console.log(
              `✓ Linked libary to ${matchingListenIds.length} listen`
            );
            libaryListenLinked++;
          } catch (error) {
            console.error(`✗ Failed to link libary listen:`, error.message);
          }
        }
      }

      // 4. Link epubcfi
      if (originalLib.epubcfi && originalLib.epubcfi.length > 0) {
        const matchingEpubcfiIds = [];

        for (const epubcfiId of originalLib.epubcfi) {
          const originalEpub = originalEpubcfi.find(
            (e) => e.userId === firebaseUserId
          );

          if (originalEpub) {
            const pbEpub = epubcfi.find(
              (e) =>
                e.epubcfi === originalEpub.epubcfi &&
                e.userId === originalEpub.userId
            );
            if (pbEpub) {
              matchingEpubcfiIds.push(pbEpub.id);
            }
          }
        }

        if (matchingEpubcfiIds.length > 0) {
          try {
            await pb.collection("libary").update(pbLibary.id, {
              epubcfi: matchingEpubcfiIds,
            });
            console.log(
              `✓ Linked libary to ${matchingEpubcfiIds.length} epubcfi`
            );
            libaryEpubcfiLinked++;
          } catch (error) {
            console.error(`✗ Failed to link libary epubcfi:`, error.message);
          }
        }
      }
    }

    console.log(`\n=== Libary Relations Linking Results ===`);
    console.log(`✓ Libary books arrays linked: ${libaryBooksLinked}`);
    console.log(`✓ Libary warengruppen linked: ${libaryWarengruppenLinked}`);
    console.log(`✓ Libary listen linked: ${libaryListenLinked}`);
    console.log(`✓ Libary epubcfi linked: ${libaryEpubcfiLinked}`);
  } catch (error) {
    console.error("Error during libary relations linking:", error);
  }
}

linkLibaryRelations();
