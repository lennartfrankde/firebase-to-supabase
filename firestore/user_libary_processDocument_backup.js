// This function processes each user_libary document during export from Firestore
// It creates libary records and separate epubcfi, listen, warengruppen records
// CRITICAL: Preserves ALL original data needed for successful relation linking

function processDocument(collectionName, doc, recordCounters, writeRecord) {
    if (collectionName === 'user_libary') {
        const userId = doc.firestore_id || doc.id;
        
        console.log(`Processing libary for user: ${userId}`);
        console.log(`- Books: ${doc.books?.length || 0}`);
        console.log(`- Favoriten: ${doc.favoriten?.length || 0}`);
        console.log(`- Gelesen: ${doc.gelesen?.length || 0}`);
        console.log(`- Listen: ${Object.keys(doc.Listen || {}).length}`);
        console.log(`- Warengruppen: ${Object.keys(doc.Warengruppen || {}).length}`);
        console.log(`- Epubcfi: ${Object.keys(doc.epubcfi || {}).length}`);
        
        // Create main libary record - PRESERVE original Firebase book IDs for linking
        const libaryRecord = {
            id: userId, // Same ID as user for linking
            Leseexemplare: doc.Leseexemplare || [],
            books: doc.books || [], // PRESERVE original Firebase book IDs
            favoriten: doc.favoriten || [], // PRESERVE original Firebase book IDs
            gelesen: doc.gelesen || [], // PRESERVE original Firebase book IDs
            // Store original map keys for linking to sub-collections
            originalListenKeys: Object.keys(doc.Listen || {}),
            originalWarengruppenKeys: Object.keys(doc.Warengruppen || {}),
            originalEpubcfiKeys: Object.keys(doc.epubcfi || {}),
            Listen: [], // Will be populated with PocketBase listen IDs during linking
            Warengruppen: [], // Will be populated with PocketBase warengruppen IDs during linking
            epubcfi: [], // Will be populated with PocketBase epubcfi IDs during linking
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        };

        // Process epubcfi map - create separate epubcfi records
        if (doc.epubcfi && typeof doc.epubcfi === 'object') {
            for (const [bookId, epubcfiValue] of Object.entries(doc.epubcfi)) {
                if (epubcfiValue && typeof epubcfiValue === 'string') {
                    const epubcfiRecord = {
                        book: bookId, // PRESERVE Firebase book ID for linking
                        epubcfi: epubcfiValue,
                        userId: userId, // PRESERVE Firebase user ID for linking
                        originalKey: bookId, // Store original key for libary linking
                        created: new Date().toISOString(),
                        updated: new Date().toISOString()
                    };
                    writeRecord('epubcfi', epubcfiRecord, recordCounters);
                }
            }
        }

        // Process Listen map - create separate listen records
        if (doc.Listen && typeof doc.Listen === 'object') {
            for (const [listenId, listenData] of Object.entries(doc.Listen)) {
                if (listenData && typeof listenData === 'object') {
                    const listenRecord = {
                        title: listenData.title || '',
                        books: listenData.books || [], // PRESERVE original Firebase book IDs
                        userId: userId, // PRESERVE Firebase user ID for linking
                        originalListenId: listenId, // Store original key for libary linking
                        created: new Date().toISOString(),
                        updated: new Date().toISOString()
                    };
                    writeRecord('listen', listenRecord, recordCounters);
                }
            }
        }

        // Process Warengruppen map - create separate warengruppen records
        if (doc.Warengruppen && typeof doc.Warengruppen === 'object') {
            for (const [warengruppenId, warengruppenData] of Object.entries(doc.Warengruppen)) {
                if (warengruppenData && typeof warengruppenData === 'object') {
                    const warengruppenRecord = {
                        title: warengruppenData.title || '',
                        books: warengruppenData.books || [], // PRESERVE original Firebase book IDs
                        userId: userId, // PRESERVE Firebase user ID for linking
                        originalWarengruppenId: warengruppenId, // Store original key for libary linking
                        created: new Date().toISOString(),
                        updated: new Date().toISOString()
                    };
                    writeRecord('warengruppen', warengruppenRecord, recordCounters);
                }
            }
        }

        return libaryRecord;
    }
    
    return doc;
}

module.exports = processDocument;