import fs from "fs";
import PocketBase from "pocketbase";

// Configuration
const POCKETBASE_URL = "https://service.serverfrank.de";
const ADMIN_EMAIL = "lennart.frank@posteo.de";
const ADMIN_PASSWORD = "8@JFAp3ggGePBcEP";

async function linkBookRelations() {
  try {
    const pb = new PocketBase(POCKETBASE_URL);

    // Admin authentication
    await pb
      .collection("_superusers")
      .authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log("✓ Authenticated as admin");

    // Read original data files
    const originalBooks = JSON.parse(fs.readFileSync("./books.json", "utf8"));
    const originalTags = JSON.parse(fs.readFileSync("./tags.json", "utf8"));
    const originalLeseexemplar = JSON.parse(
      fs.readFileSync("./leseexemplar.json", "utf8")
    );

    console.log(
      `Loaded ${originalBooks.length} original books, ${originalTags.length} tags, ${originalLeseexemplar.length} leseexemplar`
    );

    // Get all records from PocketBase
    const books = await pb.collection("books").getFullList();
    const tags = await pb.collection("tags").getFullList();
    const leseexemplar = await pb.collection("leseexemplar").getFullList();

    console.log(
      `Found ${books.length} books, ${tags.length} tags, ${leseexemplar.length} leseexemplar in PocketBase`
    );

    let bookTagLinked = 0;
    let bookLeseexemplarLinked = 0;
    let tagBookLinked = 0;

    // 1. Link books to tags (populate book.Schlagworte arrays)
    console.log("\n=== Linking Books to Tags ===");

    // Debug: Check what Schlagworte look like in original data
    const booksWithTags = originalBooks.filter(
      (book) => book.Schlagworte && book.Schlagworte.length > 0
    );
    console.log(
      `Found ${booksWithTags.length} books with Schlagworte in original data`
    );
    if (booksWithTags.length > 0) {
      console.log(`Example Schlagworte:`, booksWithTags[0].Schlagworte);
    }

    for (const originalBook of originalBooks) {
      const firebaseBookId = originalBook.uid || originalBook.id;

      // Find PocketBase book by matching some identifying fields
      const pbBook = books.find(
        (book) =>
          book.Titel === originalBook.Titel &&
          book.Autor === originalBook.Autor &&
          book.ISBN === originalBook.ISBN
      );

      if (
        pbBook &&
        originalBook.Schlagworte &&
        originalBook.Schlagworte.length > 0
      ) {
        // Find matching tags in PocketBase
        const matchingTagIds = [];

        for (const tagValue of originalBook.Schlagworte) {
          const pbTag = tags.find((tag) => tag.tag === tagValue);
          if (pbTag) {
            matchingTagIds.push(pbTag.id);
          } else {
            console.log(`Tag not found: "${tagValue}"`);
          }
        }

        if (matchingTagIds.length > 0) {
          try {
            await pb.collection("books").update(pbBook.id, {
              Schlagworte: matchingTagIds,
            });
            console.log(
              `✓ Linked book "${pbBook.Titel}" to ${matchingTagIds.length} tags`
            );
            bookTagLinked++;
          } catch (error) {
            console.error(
              `✗ Failed to link book "${pbBook.Titel}" to tags:`,
              error.message
            );
          }
        }
      }
    }

    // 2. Link books to leseexemplar (populate book.Leseexemplar arrays)
    console.log("\n=== Linking Books to Leseexemplar ===");
    for (const originalBook of originalBooks) {
      const firebaseBookId = originalBook.uid || originalBook.id;

      // Find PocketBase book
      const pbBook = books.find(
        (book) =>
          book.Titel === originalBook.Titel &&
          book.Autor === originalBook.Autor &&
          book.ISBN === originalBook.ISBN
      );

      if (pbBook) {
        // Find leseexemplar records that reference this book
        const matchingLeseexemplarIds = [];

        for (const originalLese of originalLeseexemplar) {
          if (originalLese.bookId === firebaseBookId) {
            // Find matching leseexemplar in PocketBase by userName and other fields
            const pbLese = leseexemplar.find(
              (lese) =>
                lese.userName === originalLese.userName &&
                lese.format === originalLese.format &&
                lese.kommentar === originalLese.kommentar
            );
            if (pbLese) {
              matchingLeseexemplarIds.push(pbLese.id);
            }
          }
        }

        if (matchingLeseexemplarIds.length > 0) {
          try {
            await pb.collection("books").update(pbBook.id, {
              Leseexemplar: matchingLeseexemplarIds,
            });
            console.log(
              `✓ Linked book "${pbBook.Titel}" to ${matchingLeseexemplarIds.length} leseexemplar`
            );
            bookLeseexemplarLinked++;
          } catch (error) {
            console.error(
              `✗ Failed to link book "${pbBook.Titel}" to leseexemplar:`,
              error.message
            );
          }
        }
      }
    }

    // 3. Link tags to books (populate tag.books arrays)
    console.log("\n=== Linking Tags to Books ===");
    for (const originalTag of originalTags) {
      const pbTag = tags.find((tag) => tag.tag === originalTag.tag);

      if (pbTag && originalTag.books && originalTag.books.length > 0) {
        const matchingBookIds = [];

        for (const firebaseBookId of originalTag.books) {
          // Find original book with this Firebase ID
          const originalBook = originalBooks.find(
            (book) => (book.uid || book.id) === firebaseBookId
          );

          if (originalBook) {
            // Find corresponding PocketBase book
            const pbBook = books.find(
              (book) =>
                book.Titel === originalBook.Titel &&
                book.Autor === originalBook.Autor &&
                book.ISBN === originalBook.ISBN
            );
            if (pbBook) {
              matchingBookIds.push(pbBook.id);
            }
          }
        }

        if (matchingBookIds.length > 0) {
          try {
            await pb.collection("tags").update(pbTag.id, {
              books: matchingBookIds,
            });
            console.log(
              `✓ Linked tag "${pbTag.tag}" to ${matchingBookIds.length} books`
            );
            tagBookLinked++;
          } catch (error) {
            console.error(
              `✗ Failed to link tag "${pbTag.tag}" to books:`,
              error.message
            );
          }
        }
      }
    }

    console.log(`\n=== Book Relations Linking Results ===`);
    console.log(`✓ Books linked to tags: ${bookTagLinked}`);
    console.log(`✓ Books linked to leseexemplar: ${bookLeseexemplarLinked}`);
    console.log(`✓ Tags linked to books: ${tagBookLinked}`);
  } catch (error) {
    console.error("Error during book relations linking:", error);
  }
}

linkBookRelations();
