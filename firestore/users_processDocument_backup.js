// This function processes each user document during export from Firestore
// It splits user data into users and userData records with matching IDs
// CRITICAL: Preserves all original Firebase IDs and relationships

function processDocument(collectionName, doc, recordCounters, writeRecord) {
    if (collectionName === 'users') {
        const userId = doc.firestore_id || doc.id;
        
        console.log(`Processing user: ${userId}, email: ${doc.email}, userName: ${doc.userName}`);
        
        // Create main user record (authentication data)
        const userRecord = {
            id: userId, // Keep original Firebase ID for matching with auth users
            email: doc.email || '',
            emailVisibility: true,
            verified: doc.emailVerified || false,
            name: doc.displayName || doc.userName || '',
            avatar: doc.photoURL || '',
            uid: userId, // CRITICAL: Store Firebase UID for linking to auth users
            role: Array.isArray(doc.role) ? doc.role[doc.role.length - 1] : (doc.role || 'buchhaendler'),
            newsletter: doc.newsletter || false,
            steuer: doc.steuer || '',
            unlocked: doc.unlocked || false,
            blocked: doc.blocked || false,
            // These will be populated during linking phase
            libary: "", // Will link to libary with same Firebase user ID
            userData: "", // Will link to userData with same Firebase user ID
            oauthid: doc.oauthid || '',
            oauthusername: doc.oauthusername || '',
            oauthprovider: doc.oauthprovider || '',
            stripe: doc.stripe || '',
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        };

        // Create userData record (profile/contact information)
        const userDataRecord = {
            id: userId, // Same ID as user for linking
            userName: doc.userName || '',
            buchhaltung: doc.buchhaltung || '',
            kontakt: doc.kontakt || '',
            verlagId: doc.verlagId || '',
            verlagsname: doc.verlagsname || '',
            buchhandlung: doc.buchhandlung || '',
            arbeit: doc.arbeit || '',
            verkehr: doc.verkehr || '',
            homepage: doc.homepage || '',
            benachrichtigung: doc.benachrichtigung || '',
            telefon: doc.telefon || '',
            land: doc.land || '',
            ort: doc.ort || '',
            plz: doc.plz || '',
            num: doc.num || '',
            street: doc.street || '',
            originalFirebaseId: userId, // Store for linking
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        };

        // Write userData record to separate collection
        writeRecord('userData', userDataRecord, recordCounters);
        
        return userRecord;
    }
    
    return doc;
}

module.exports = processDocument;