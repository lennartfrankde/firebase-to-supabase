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

  // Process epubcfi entries - these become separate records
  if (doc.epubcfi && typeof doc.epubcfi === "object") {
    Object.entries(doc.epubcfi).forEach(([bookId, cfiString]) => {
      if (bookId && cfiString && typeof cfiString === "string") {
        const epubcfiRecord = {
          book: bookId, // Relation to books
          epubcfi: cfiString,
          userId: doc.firestore_id, // Reference to the user this library belongs to
          created: new Date(),
          updated: new Date(),
        };
        writeRecord("epubcfi", epubcfiRecord, recordCounters);
      }
    });
  }

  // Process Listen (Lists) - these become separate records
  if (doc.Listen && typeof doc.Listen === "object") {
    Object.entries(doc.Listen).forEach(([listName, bookArray]) => {
      if (listName && bookArray && Array.isArray(bookArray)) {
        const listenRecord = {
          title: listName,
          books: bookArray, // Array of book IDs
          userId: doc.firestore_id, // Reference to the user
          created: new Date(),
          updated: new Date(),
        };
        writeRecord("listen", listenRecord, recordCounters);
      }
    });
  }

  // Process Warengruppen (Product groups) - these become separate records
  if (doc.Warengruppen && typeof doc.Warengruppen === "object") {
    Object.entries(doc.Warengruppen).forEach(([groupName, bookArray]) => {
      if (groupName && bookArray && Array.isArray(bookArray)) {
        const warengruppenRecord = {
          title: groupName,
          books: bookArray, // Array of book IDs
          userId: doc.firestore_id, // Reference to the user
          created: new Date(),
          updated: new Date(),
        };
        writeRecord("warengruppen", warengruppenRecord, recordCounters);
      }
    });
  }

  // Clean up fields that are now handled as separate records
  delete doc.epubcfi;
  delete doc.Listen;
  delete doc.Warengruppen;

  // Map remaining fields to libary schema
  const libaryRecord = {
    id: doc.firestore_id, // Use firestore_id as PocketBase ID
    Leseexemplare: doc.Leseexemplare || [], // Array of leseexemplar IDs
    books: doc.books || [], // Array of book IDs
    favoriten: doc.favoriten || [], // Array of favorite book IDs
    gelesen: doc.gelesen || [], // Array of read book IDs
    Listen: [], // Will be populated with relation IDs to listen records
    Warengruppen: [], // Will be populated with relation IDs to warengruppen records
    epubcfi: [], // Will be populated with relation IDs to epubcfi records
    created: safeConvertToDate(doc.created) || new Date(),
    updated: safeConvertToDate(doc.updated) || new Date(),
  };

  // Clean up original doc fields
  delete doc.firestore_id;
  delete doc.created;
  delete doc.updated;

  return libaryRecord;
};
