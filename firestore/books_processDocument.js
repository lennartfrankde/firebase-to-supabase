/**
 * Safely converts various timestamp representations to a JavaScript Date object.
 * Handles:
 * 1. Firestore Timestamp objects (e.g., { _seconds: N, _nanoseconds: M })
 * 2. ISO 8601 date strings (e.g., "2023-10-26T10:00:00Z")
 * 3. Already existing Date objects
 *
 * @param {*} value The value to convert.
 * @returns {Date|null} A Date object if conversion is successful, otherwise null.
 */
function safeConvertToDate(value) {
  // Case 1: Firestore Timestamp object (e.g., from exported JSON)
  if (
    value &&
    typeof value === "object" &&
    typeof value._seconds === "number" &&
    typeof value._nanoseconds === "number"
  ) {
    // Convert seconds and nanoseconds to milliseconds
    const milliseconds = value._seconds * 1000 + value._nanoseconds / 1000000;
    const date = new Date(milliseconds);
    // Basic validation to ensure it's a valid date
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Case 2: ISO 8601 date string (e.g., from older exports or manual strings)
  if (typeof value === "string" && value) {
    const date = new Date(value);
    // Check if the date is valid (e.g., not "Invalid Date")
    if (!isNaN(date.getTime())) {
      return date;
    }
  }

  // Case 3: Already a Date object
  if (value instanceof Date) {
    return value;
  }

  // If none of the above, return null
  return new Date();
}

module.exports = (collectionName, doc, recordCounters, writeRecord) => {
  console.log(
    `Processing document in collection: ${collectionName}, ID: ${doc.firestore_id}`
  );

  // Process Schlagworte (tags) - convert array to separate records
  if (doc.Schlagworte && Array.isArray(doc.Schlagworte)) {
    doc.Schlagworte.forEach((tag) => {
      if (tag && typeof tag === "string") {
        const tagRecord = {
          tag: tag,
          books: [doc.firestore_id], // Reference to this book
        };
        writeRecord("tags", tagRecord, recordCounters);
      }
    });
    // Keep Schlagworte as relation IDs (will be handled by PocketBase)
  }

  // Process Links - simple string array, convert to separate records
  if (doc.Links && Array.isArray(doc.Links)) {
    doc.Links.forEach((link, index) => {
      if (link && typeof link === "string" && link !== "x") {
        // Filter out placeholder 'x' values
        const linkRecord = {
          name: `Link ${index + 1}`,
          link: link,
          verlagId: doc.verlagId || "",
        };
        writeRecord("links", linkRecord, recordCounters);
      }
    });
  }

  // Process LeseexemplarAnfordern entries (if they exist)
  if (
    doc.LeseexemplarAnfordern &&
    typeof doc.LeseexemplarAnfordern === "object"
  ) {
    console.log(
      `Processing LeseexemplarAnfordern for book: ${doc.Titel} (${doc.firestore_id})`
    );
    // Iterate through each request entry
    Object.entries(doc.LeseexemplarAnfordern).forEach(
      ([userId, requestData]) => {
        const leseexemplar = {
          userName: requestData.userName || "",
          format: requestData.format || "epub",
          kommentar: requestData.kommentar || "",
          accepted: requestData.accepted || false,
          edited: requestData.edited || false,
          mailSend: requestData.mailSend || false,
          sent: requestData.sent || false,
          userData: userId, // Reference to user
          bookId: doc.firestore_id,
          verlagId: doc.verlagId || "",
          firebaseBookId: doc.firestore_id, // Keep original Firebase book ID
          firebaseUserId: userId, // Keep original Firebase user ID
          userId: userId,
          created: safeConvertToDate(requestData.time) || new Date(),
          updated: safeConvertToDate(requestData.time) || new Date(),
        };

        writeRecord("leseexemplar", leseexemplar, recordCounters);
      }
    );

    delete doc.LeseexemplarAnfordern;
  }

  // Clean up fields that are now handled as relations or separate records
  delete doc.id;
  delete doc.Id; // Remove Firebase document ID
  delete doc.Links; // Now handled as separate records

  // Map Firebase fields to PocketBase schema
  const bookRecord = {
    id: doc.firestore_id, // Use firestore_id as PocketBase ID
    Titel: doc.Titel || "",
    Autor: doc.Autor || "",
    Warengruppe: doc.Warengruppe || "",
    Beschreibung: doc.Beschreibung || "",
    Anmerkung: doc.Anmerkungen || "", // Note: Firebase uses "Anmerkungen", PB uses "Anmerkung"
    ET: safeConvertToDate(doc.ET) || null,
    Format: doc.Format || "",
    ISBN: doc.ISBN || "",
    Schlagworte: [], // Will be populated with relation IDs from tags table
    Links: [], // Will be populated with relation IDs from links table
    Preis: doc.Preis || 0,
    Seiten: doc.Seiten || 0,
    SerieBool: doc.SerieBool || false,
    Serie: doc.Serie || "",
    Waehrung: doc.Waehrung || "",
    published: doc.published || false,
    accepted: doc.accepted || false,
    Leseexemplar: doc.Leseexemplar || [], // Keep as array of user IDs
    autoAccept: doc.autoAccept || false,
    verlagId: doc.verlagId || "",
    edited: doc.edited || false,
    printVersion: doc.printVersion ? "true" : "false", // Convert boolean to string as per schema
    paid: doc.paid || false,
    benachrichtigung: doc.benachrichtigung || "",
    email: doc.email || "",
    ZInfo: doc.ZInfo || "",
    lateUpload: doc.lateUpload || false,
    lateProbe: doc.lateProbe || false,
    lastChecked: safeConvertToDate(doc.lastChecked) || new Date(),
    Cover: doc.Cover || "",
    LeseprobeFile: doc.LeseprobeLink || "",
    blocked: false, // Default value
    uid: doc.firestore_id, // Use firestore_id as uid
    qrCodeDownloads: doc.qrCodeDownloads || 0,
    qrCodeScans: doc.qrCodeScans || 0,
    VT: safeConvertToDate(doc.VT) || null,
    leseprobeViews: doc.leseprobeViews || 0,
    leseexemplarDownloads: doc.leseexemplarDownloads || 0,
    CoverFileName: "", // Will need to be extracted from Cover URL if needed
    LeseprobeFileName: "", // Will need to be extracted from LeseprobeLink if needed
    LeseexemplarFileName: "", // Will need to be extracted from LeseexemplarLink if needed
    benachrichtigungLeseexemplar: doc.benachrichtigungLeseexemplar || [], // Array of user IDs who want leseexemplar notifications
    benachrichtigungLeseprobe: doc.benachrichtigungLeseprobe || [], // Array of user IDs who want leseprobe notifications
    firebaseSchlagworte: doc.Schlagworte || [], // Keep original Schlagworte array for reference
    firebaseBenachrichtigungLeseprobe: doc.benachrichtigungLeseprobe || [],
    firebaseBenachrichtigungLeseexemplar:
      doc.benachrichtigungLeseexemplar || [],
    created: safeConvertToDate(doc.created) || new Date(),
    updated: safeConvertToDate(doc.updated) || new Date(),
  };

  // Clean up original doc fields that are now in bookRecord
  delete doc.created;
  delete doc.updated;
  delete doc.firestore_id;
  delete doc.Schlagworte; // Now handled as separate records

  return bookRecord;
};
