import fs from "fs";
import PocketBase from "pocketbase";

// Configuration
const POCKETBASE_URL = "https://service.serverfrank.de";
const ADMIN_EMAIL = "lennart.frank@posteo.de";
const ADMIN_PASSWORD = "8@JFAp3ggGePBcEP";
const ID_MAPPINGS_FILE = "./id_mappings.json";

function loadIdMappings() {
  if (fs.existsSync(ID_MAPPINGS_FILE)) {
    return JSON.parse(fs.readFileSync(ID_MAPPINGS_FILE, "utf8"));
  }
  console.error("ID mappings file not found. Please run the import first.");
  process.exit(1);
}

function mapFirebaseIdToPocketBase(mappings, collectionName, firebaseId) {
  if (mappings[collectionName] && mappings[collectionName][firebaseId]) {
    return mappings[collectionName][firebaseId];
  }
  return null;
}

async function linkLeseexemplarRelations(pb, mappings) {
  console.log("\n🔗 Linking leseexemplar relations...");

  try {
    // Get all leseexemplar records
    const leseexemplare = await pb.collection("leseexemplar").getFullList();
    console.log(`Found ${leseexemplare.length} leseexemplar records`);

    let updated = 0;
    let failed = 0;

    for (const leseexemplar of leseexemplare) {
      try {
        let needsUpdate = false;
        const updateData = {};

        // Map userData relation - need to get userData ID from user record
        if (leseexemplar.firebaseUserId) {
          const pocketbaseUserId = mapFirebaseIdToPocketBase(
            mappings,
            "users",
            leseexemplar.firebaseUserId
          );
          if (pocketbaseUserId) {
            try {
              // Get the user record to find their userData relation
              const user = await pb
                .collection("users")
                .getOne(pocketbaseUserId);

              if (user.userData) {
                updateData.userData = user.userData;
                updateData.userId = pocketbaseUserId;
                needsUpdate = true;
                console.log(
                  `✅ Found userData ${user.userData} for user ${pocketbaseUserId}`
                );
              } else {
                console.warn(
                  `❌ User ${pocketbaseUserId} has no userData relation for leseexemplar ${leseexemplar.id}`
                );
              }
            } catch (userLookupError) {
              console.error(
                `❌ Failed to lookup user ${pocketbaseUserId}:`,
                userLookupError.message
              );
            }
          } else {
            console.warn(
              `❌ Could not map user ID ${leseexemplar.firebaseUserId} for leseexemplar ${leseexemplar.id}`
            );
          }
        }

        // Map bookId relation if it's still a Firebase ID
        if (leseexemplar.firebaseBookId) {
          const pocketbaseBookId = mapFirebaseIdToPocketBase(
            mappings,
            "books",
            leseexemplar.firebaseBookId
          );
          if (pocketbaseBookId) {
            updateData.bookId = pocketbaseBookId;
            needsUpdate = true;
          } else {
            console.warn(
              `❌ Could not map book ID ${leseexemplar.firebaseBookId} for leseexemplar ${leseexemplar.id}`
            );
          }
        }

        if (needsUpdate) {
          await pb
            .collection("leseexemplar")
            .update(leseexemplar.id, updateData);
          updated++;
          console.log(`✅ Updated leseexemplar ${leseexemplar.id}`);
        }
      } catch (error) {
        console.error(
          `❌ Failed to update leseexemplar ${leseexemplar.id}:`,
          error.message
        );
        failed++;
      }
    }

    console.log(
      `📊 Leseexemplar relations: ${updated} updated, ${failed} failed`
    );
  } catch (error) {
    console.error("❌ Error linking leseexemplar relations:", error.message);
  }
}

async function linkBookRelations(pb, mappings) {
  console.log("\n🔗 Linking book relations...");

  try {
    // Get all books
    const books = await pb.collection("books").getFullList();
    console.log(`Found ${books.length} books`);

    let updated = 0;
    let failed = 0;

    for (const book of books) {
      try {
        let needsUpdate = false;
        const updateData = {};

        // Link Schlagworte (tags)
        if (
          book.firebaseSchlagworte &&
          Array.isArray(book.firebaseSchlagworte)
        ) {
          console.log(
            `Processing Schlagworte for book: ${book.Titel} (${book.id})`
          );
          const tagIds = [];
          for (const tagText of book.firebaseSchlagworte) {
            console.log(
              `Searching for tag "${tagText}" for book ${book.id} (${book.Titel})`
            );
            // Find tag record by tag text and book reference
            const tags = await pb.collection("tags").getFullList({
              filter: `tag = "${tagText}" && firebaseBookIds ~ "${book.firebaseId}"`,
            });

            console.log(
              `Searching for tag "${tagText}" for book ${book.id} (${book.Titel})`,
              tags
            );

            if (tags.length > 0) {
              tagIds.push(tags[0].id);
            } else {
              console.warn(
                `❌ Could not find tag "${tagText}" for book ${book.id}`
              );
            }
          }

          if (tagIds.length > 0) {
            updateData.Schlagworte = tagIds;
            needsUpdate = true;
          }
        }

        // Link Leseexemplar
        const leseexemplare = await pb.collection("leseexemplar").getFullList({
          filter: `bookId = "${book.id}"`,
        });

        if (leseexemplare.length > 0) {
          updateData.Leseexemplar = leseexemplare.map((l) => l.id);
          needsUpdate = true;
        }

        // Link benachrichtigungLeseexemplar - need to get userData IDs from user records
        if (
          book.firebaseBenachrichtigungLeseexemplar &&
          Array.isArray(book.firebaseBenachrichtigungLeseexemplar)
        ) {
          const userDataIds = [];
          for (const firebaseUserId of book.firebaseBenachrichtigungLeseexemplar) {
            const pocketbaseUserId = mapFirebaseIdToPocketBase(
              mappings,
              "users",
              firebaseUserId
            );
            if (pocketbaseUserId) {
              try {
                const user = await pb
                  .collection("users")
                  .getOne(pocketbaseUserId);
                if (user.userData) {
                  userDataIds.push(user.userData);
                }
              } catch (userError) {
                console.warn(
                  `❌ Could not get userData for user ${pocketbaseUserId}`
                );
              }
            }
          }

          if (userDataIds.length > 0) {
            updateData.benachrichtigungLeseexemplar = userDataIds;
            needsUpdate = true;
          }
        }

        // Link benachrichtigungLeseprobe - need to get userData IDs from user records
        if (
          book.firebaseBenachrichtigungLeseprobe &&
          Array.isArray(book.firebaseBenachrichtigungLeseprobe)
        ) {
          const userDataIds = [];
          for (const firebaseUserId of book.firebaseBenachrichtigungLeseprobe) {
            const pocketbaseUserId = mapFirebaseIdToPocketBase(
              mappings,
              "users",
              firebaseUserId
            );
            if (pocketbaseUserId) {
              try {
                const user = await pb
                  .collection("users")
                  .getOne(pocketbaseUserId);
                if (user.userData) {
                  userDataIds.push(user.userData);
                }
              } catch (userError) {
                console.warn(
                  `❌ Could not get userData for user ${pocketbaseUserId}`
                );
              }
            }
          }

          if (userDataIds.length > 0) {
            updateData.benachrichtigungLeseprobe = userDataIds;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          await pb.collection("books").update(book.id, updateData);
          updated++;
          console.log(`✅ Updated book ${book.id} (${book.Titel})`);
        }
      } catch (error) {
        console.error(`❌ Failed to update book ${book.id}:`, error.message);
        failed++;
      }
    }

    console.log(`📊 Book relations: ${updated} updated, ${failed} failed`);
  } catch (error) {
    console.error("❌ Error linking book relations:", error.message);
  }
}

async function linkTagRelations(pb, mappings) {
  console.log("\n🔗 Linking tag relations...");

  try {
    // Get all tags
    const tags = await pb.collection("tags").getFullList();
    console.log(`Found ${tags.length} tags`);

    let updated = 0;
    let failed = 0;

    for (const tag of tags) {
      try {
        if (tag.firebaseBookIds && Array.isArray(tag.firebaseBookIds)) {
          const bookIds = [];

          for (const firebaseBookId of tag.firebaseBookIds) {
            const pocketbaseBookId = mapFirebaseIdToPocketBase(
              mappings,
              "books",
              firebaseBookId
            );
            if (pocketbaseBookId) {
              bookIds.push(pocketbaseBookId);
            }
          }

          if (bookIds.length > 0) {
            await pb.collection("tags").update(tag.id, { books: bookIds });
            updated++;
            console.log(`✅ Updated tag ${tag.id} (${tag.tag})`);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to update tag ${tag.id}:`, error.message);
        failed++;
      }
    }

    console.log(`📊 Tag relations: ${updated} updated, ${failed} failed`);
  } catch (error) {
    console.error("❌ Error linking tag relations:", error.message);
  }
}

async function cleanupFirebaseFields(pb) {
  console.log("\n🧹 Cleaning up Firebase mapping fields...");

  const collections = [
    {
      name: "books",
      fields: [
        "firebaseSchlagworte",
        "firebaseLeseexemplar",
        "firebaseBenachrichtigungLeseexemplar",
        "firebaseBenachrichtigungLeseprobe",
        "firebaseId",
      ],
    },
    {
      name: "leseexemplar",
      fields: ["firebaseUserId", "firebaseBookId", "firebaseId"],
    },
    { name: "tags", fields: ["firebaseBookIds", "firebaseId"] },
    { name: "users", fields: ["firebaseId"] },
    { name: "userData", fields: ["firebaseId"] },
    { name: "libary", fields: ["firebaseId"] },
  ];

  for (const collection of collections) {
    try {
      const records = await pb.collection(collection.name).getFullList();
      console.log(`Cleaning ${records.length} ${collection.name} records...`);

      for (const record of records) {
        const updateData = {};
        let needsUpdate = false;

        for (const field of collection.fields) {
          if (record[field] !== undefined) {
            updateData[field] = null;
            needsUpdate = true;
          }
        }

        if (needsUpdate) {
          await pb.collection(collection.name).update(record.id, updateData);
        }
      }

      console.log(`✅ Cleaned ${collection.name} collection`);
    } catch (error) {
      console.warn(`⚠️ Could not clean ${collection.name}:`, error.message);
    }
  }
}

async function main() {
  try {
    console.log("🔗 Starting relation linking process...");

    // Initialize PocketBase client
    const pb = new PocketBase(POCKETBASE_URL);

    // Admin authentication
    await pb
      .collection("_superusers")
      .authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log("✅ Authenticated with PocketBase");

    // Load ID mappings
    const mappings = loadIdMappings();
    console.log("📋 Loaded ID mappings");

    // Link relations in order
    await linkLeseexemplarRelations(pb, mappings);
    await linkTagRelations(pb, mappings);
    await linkBookRelations(pb, mappings);

    // Optional: Clean up Firebase mapping fields
    const shouldCleanup = process.argv.includes("--cleanup");
    if (shouldCleanup) {
      await cleanupFirebaseFields(pb);
    } else {
      console.log(
        "\n💡 Run with --cleanup flag to remove Firebase mapping fields"
      );
    }

    console.log("\n🎉 Relation linking complete!");
  } catch (error) {
    console.error("💥 Relation linking failed:", error);
    process.exit(1);
  }
}

main();
