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

  // Create userData record with all the fields that belong to userData collection
  const userData = {
    id: doc.firestore_id, // Use firestore_id as PocketBase ID
    userName: doc.userName || "",
    buchhaltung: doc.buchhaltung || "",
    kontakt: doc.kontakt || "",
    verlagId: doc.verlagId || "", // Added missing field from schema
    verlagsname: doc.verlagsname || "",
    buchhandlung: doc.buchhandlung || "",
    arbeit: doc.arbeit || "",
    verkehr: doc.verkehr || "",
    homepage: doc.homepage || "",
    benachrichtigung: doc.benachrichtigung || "",
    telefon: doc.telefon || "",
    land: doc.land || "",
    ort: doc.ort || "",
    plz: doc.plz || "",
    num: doc.num || "",
    street: doc.street || "",
    created: safeConvertToDate(doc.created) || new Date(),
    updated: safeConvertToDate(doc.updated) || new Date(),
  };

  writeRecord("userData", userData, recordCounters);

  // Process role - convert array to single string value
  if (doc.role && Array.isArray(doc.role)) {
    let roleTier = 0;
    for (const role of doc.role) {
      if (role === "admin") {
        roleTier = 3;
      } else if (role === "verlag" && roleTier < 2) {
        roleTier = 2;
      } else if (role === "buchhaendler" && roleTier < 1) {
        roleTier = 1;
      }
    }
    switch (roleTier) {
      case 3:
        doc.role = "admin";
        break;
      case 2:
        doc.role = "verlag";
        break;
      case 1:
        doc.role = "buchhaendler";
        break;
      default:
        doc.role = "buchhaendler";
        break;
    }
  } else if (typeof doc.role === "string") {
    // Keep as is if already a string
  } else {
    doc.role = "buchhaendler"; // Default role if none is specified
  }

  // Map remaining fields to users schema
  const userRecord = {
    id: doc.firestore_id, // Use firestore_id as PocketBase ID
    uid: doc.uid || doc.firestore_id, // Use Firebase UID or firestore_id
    password: "", // Will be set during authentication
    tokenKey: "",
    email: doc.email || "",
    emailVisibility: false,
    verified: doc.verified || false,
    name: doc.displayName || doc.name || doc.userName || "",
    avatar: doc.photoURL || "",
    oauthid: doc.oauthid || "",
    oauthusername: doc.oauthusername || "",
    oauthprovider: doc.oauthprovider || "",
    libary: "", // Will be populated with relation ID
    role: doc.role,
    stripe: doc.stripe || "",
    newsletter: doc.newsletter || false,
    steuer: doc.steuer || "",
    unlocked: doc.unlocked || false,
    blocked: doc.blocked || false,
    userData: "", // Will be populated with relation ID to userData record
    created: safeConvertToDate(doc.created) || new Date(),
    updated: safeConvertToDate(doc.updated) || new Date(),
  };

  return userRecord;
};
