import fs from "fs";
import PocketBase from "pocketbase";

// Configuration
const POCKETBASE_URL = "https://service.serverfrank.de";
const ADMIN_EMAIL = "lennart.frank@posteo.de";
const ADMIN_PASSWORD = "8@JFAp3ggGePBcEP";

// ID Mapping system
const ID_MAPPINGS_FILE = "./id_mappings.json";

function loadIdMappings() {
  if (fs.existsSync(ID_MAPPINGS_FILE)) {
    return JSON.parse(fs.readFileSync(ID_MAPPINGS_FILE, "utf8"));
  }
  throw new Error("ID mappings file not found. Please run imports first.");
}

function getPocketBaseId(collectionName, firebaseId, mappings) {
  return mappings[collectionName] && mappings[collectionName][firebaseId];
}

async function linkAllRelations() {
  try {
    const pb = new PocketBase(POCKETBASE_URL);

    // Admin authentication
    await pb
      .collection("_superusers")
      .authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log("✓ Authenticated as admin");

    // Load ID mappings
    const mappings = loadIdMappings();
    console.log("✓ Loaded ID mappings");
    console.log(`Collections in mappings: ${Object.keys(mappings).join(", ")}`);

    // Read original data files
    const originalData = {
      users: JSON.parse(fs.readFileSync("./users.json", "utf8")),
      userData: JSON.parse(fs.readFileSync("./userData.json", "utf8")),
      user_libary: JSON.parse(fs.readFileSync("./user_libary.json", "utf8")),
      books: JSON.parse(fs.readFileSync("./books.json", "utf8")),
      tags: JSON.parse(fs.readFileSync("./tags.json", "utf8")),
      leseexemplar: JSON.parse(fs.readFileSync("./leseexemplar.json", "utf8")),
      listen: JSON.parse(fs.readFileSync("./listen.json", "utf8")),
      warengruppen: JSON.parse(fs.readFileSync("./warengruppen.json", "utf8")),
      epubcfi: JSON.parse(fs.readFileSync("./epubcfi.json", "utf8")),
    };

    console.log("✓ Loaded all original data files");

    let stats = {
      usersLinked: 0,
      booksLinked: 0,
      libaryLinked: 0,
      tagsLinked: 0,
      leseexemplarLinked: 0,
      errors: 0,
    };

    // 1. Link users to userData and libary
    console.log("\n=== 1. Linking Users to userData and libary ===");
    for (const userData of originalData.userData) {
      const firebaseUserId = userData.id;
      const userPbId = getPocketBaseId("users", firebaseUserId, mappings);
      const userDataPbId = getPocketBaseId(
        "userData",
        firebaseUserId,
        mappings
      );

      if (userPbId && userDataPbId) {
        try {
          await pb
            .collection("users")
            .update(userPbId, { userData: userDataPbId });
          console.log(`✓ Linked user ${firebaseUserId} to userData`);
          stats.usersLinked++;
        } catch (error) {
          console.error(`✗ Failed to link user to userData:`, error.message);
          stats.errors++;
        }
      }
    }

    for (const libary of originalData.user_libary) {
      const firebaseUserId = libary.id;
      const userPbId = getPocketBaseId("users", firebaseUserId, mappings);
      const libaryPbId = getPocketBaseId("libary", firebaseUserId, mappings);

      if (userPbId && libaryPbId) {
        try {
          await pb.collection("users").update(userPbId, { libary: libaryPbId });
          console.log(`✓ Linked user ${firebaseUserId} to libary`);
          stats.usersLinked++;
        } catch (error) {
          console.error(`✗ Failed to link user to libary:`, error.message);
          stats.errors++;
        }
      }
    }

    // 2. Link books to tags and leseexemplar
    console.log("\n=== 2. Linking Books to Tags and Leseexemplar ===");
    for (const book of originalData.books) {
      const firebaseBookId = book.uid || book.id;
      const bookPbId = getPocketBaseId("books", firebaseBookId, mappings);

      if (!bookPbId) continue;

      // Link to tags
      if (book.Schlagworte && book.Schlagworte.length > 0) {
        const tagIds = [];
        for (const tagValue of book.Schlagworte) {
          // Find tag by value in original tags data
          const originalTag = originalData.tags.find((t) => t.tag === tagValue);
          if (originalTag) {
            const tagPbId = getPocketBaseId(
              "tags",
              originalTag.id || `tag_${tagValue}`,
              mappings
            );
            if (tagPbId) tagIds.push(tagPbId);
          }
        }

        if (tagIds.length > 0) {
          try {
            await pb
              .collection("books")
              .update(bookPbId, { Schlagworte: tagIds });
            console.log(
              `✓ Linked book ${firebaseBookId} to ${tagIds.length} tags`
            );
          } catch (error) {
            console.error(`✗ Failed to link book to tags:`, error.message);
            stats.errors++;
          }
        }
      }

      // Link to leseexemplar
      const leseexemplarIds = [];
      for (const lese of originalData.leseexemplar) {
        if (lese.bookId === firebaseBookId) {
          const leseId = lese.id || `lese_${lese.userName}_${lese.bookId}`;
          const lesePbId = getPocketBaseId("leseexemplar", leseId, mappings);
          if (lesePbId) leseexemplarIds.push(lesePbId);
        }
      }

      if (leseexemplarIds.length > 0) {
        try {
          await pb
            .collection("books")
            .update(bookPbId, { Leseexemplar: leseexemplarIds });
          console.log(
            `✓ Linked book ${firebaseBookId} to ${leseexemplarIds.length} leseexemplar`
          );
          stats.booksLinked++;
        } catch (error) {
          console.error(
            `✗ Failed to link book to leseexemplar:`,
            error.message
          );
          stats.errors++;
        }
      }
    }

    // 3. Link libary to sub-collections
    console.log("\n=== 3. Linking Libary to Sub-collections ===");
    for (const libary of originalData.user_libary) {
      const firebaseUserId = libary.id;
      const libaryPbId = getPocketBaseId("libary", firebaseUserId, mappings);

      if (!libaryPbId) continue;

      const updates = {};

      // Link book arrays (books, favoriten, gelesen)
      const bookArrays = ["books", "favoriten", "gelesen"];
      for (const arrayName of bookArrays) {
        if (libary[arrayName] && libary[arrayName].length > 0) {
          const bookIds = [];
          for (const firebaseBookId of libary[arrayName]) {
            const bookPbId = getPocketBaseId("books", firebaseBookId, mappings);
            if (bookPbId) bookIds.push(bookPbId);
          }
          if (bookIds.length > 0) {
            updates[arrayName] = bookIds;
          }
        }
      }

      // Link Listen
      if (libary.Listen && libary.Listen.length > 0) {
        const listenIds = [];
        for (const listenFirebaseId of libary.Listen) {
          const listenPbId = getPocketBaseId(
            "listen",
            listenFirebaseId,
            mappings
          );
          if (listenPbId) listenIds.push(listenPbId);
        }
        if (listenIds.length > 0) {
          updates.Listen = listenIds;
        }
      }

      // Link Warengruppen
      if (libary.Warengruppen && libary.Warengruppen.length > 0) {
        const warengruppenIds = [];
        for (const warengruppenFirebaseId of libary.Warengruppen) {
          const warengruppenPbId = getPocketBaseId(
            "warengruppen",
            warengruppenFirebaseId,
            mappings
          );
          if (warengruppenPbId) warengruppenIds.push(warengruppenPbId);
        }
        if (warengruppenIds.length > 0) {
          updates.Warengruppen = warengruppenIds;
        }
      }

      // Link epubcfi
      if (libary.epubcfi && libary.epubcfi.length > 0) {
        const epubcfiIds = [];
        for (const epubcfiFirebaseId of libary.epubcfi) {
          const epubcfiPbId = getPocketBaseId(
            "epubcfi",
            epubcfiFirebaseId,
            mappings
          );
          if (epubcfiPbId) epubcfiIds.push(epubcfiPbId);
        }
        if (epubcfiIds.length > 0) {
          updates.epubcfi = epubcfiIds;
        }
      }

      // Apply all updates
      if (Object.keys(updates).length > 0) {
        try {
          await pb.collection("libary").update(libaryPbId, updates);
          console.log(
            `✓ Linked libary ${firebaseUserId} with ${
              Object.keys(updates).length
            } relation types`
          );
          stats.libaryLinked++;
        } catch (error) {
          console.error(`✗ Failed to link libary relations:`, error.message);
          stats.errors++;
        }
      }
    }

    // 4. Link tags back to books
    console.log("\n=== 4. Linking Tags to Books ===");
    for (const tag of originalData.tags) {
      const tagFirebaseId = tag.id || `tag_${tag.tag}`;
      const tagPbId = getPocketBaseId("tags", tagFirebaseId, mappings);

      if (!tagPbId || !tag.books || tag.books.length === 0) continue;

      const bookIds = [];
      for (const firebaseBookId of tag.books) {
        const bookPbId = getPocketBaseId("books", firebaseBookId, mappings);
        if (bookPbId) bookIds.push(bookPbId);
      }

      if (bookIds.length > 0) {
        try {
          await pb.collection("tags").update(tagPbId, { books: bookIds });
          console.log(`✓ Linked tag "${tag.tag}" to ${bookIds.length} books`);
          stats.tagsLinked++;
        } catch (error) {
          console.error(`✗ Failed to link tag to books:`, error.message);
          stats.errors++;
        }
      }
    }

    console.log(`\n🎉 === Linking Complete ===`);
    console.log(`✓ Users linked: ${stats.usersLinked}`);
    console.log(`✓ Books linked: ${stats.booksLinked}`);
    console.log(`✓ Libary linked: ${stats.libaryLinked}`);
    console.log(`✓ Tags linked: ${stats.tagsLinked}`);
    console.log(`❌ Errors: ${stats.errors}`);
  } catch (error) {
    console.error("💥 Error during linking:", error);
  }
}

linkAllRelations();
