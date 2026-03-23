// importData.js
const admin = require('firebase-admin');
const serviceAccount = require('./shop-jj-app-firebase-adminsdk-fbsvc-887a2f804e.json'); // Adjust path and filename
const fs = require('fs');

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Function to import a single JSON file into a Firestore collection
async function importJsonToFirestore(jsonFilePath, collectionName) {
    try {
        const rawData = fs.readFileSync(jsonFilePath);
        const dataArray = JSON.parse(rawData);

        console.log(`Starting import for ${collectionName} from ${jsonFilePath}...`);

        for (const item of dataArray) {
            // Use a field like 'productId' as the document ID if available and unique.
            // Otherwise, Firestore will auto-generate one with collectionRef.add(item)
            const productId = item.productId; // Assuming 'productId' exists and is unique in your JSON objects

            if (productId) {
                await db.collection(collectionName).doc(productId).set(item);
                // console.log(`Added/Updated document ${productId} in ${collectionName}`);
            } else {
                await db.collection(collectionName).add(item);
                // console.log(`Added document with auto-ID in ${collectionName}`);
            }
        }
        console.log(`Successfully imported ${dataArray.length} items to ${collectionName}.`);
    } catch (error) {
        console.error(`Error importing ${jsonFilePath} to ${collectionName}:`, error);
    }
}

// Call the function for each of your files
async function runImport() {
    await importJsonToFirestore('./prodStockCalc.json', 'shopeeProdStockCalc');
    await importJsonToFirestore('./orgProductInfo.json', 'shopeeOrgProductInfo');
    // ... repeat for your other 4 JSON files (TikTok and other Shopee)
    await importJsonToFirestore('./prodActPriceCalc.json', 'shopeeProdActPriceCalc');
    // await importJsonToFirestore('./orgProductInfoTikTok.json', 'tiktokOrgProductInfoTikTok');
    await importJsonToFirestore('./prodActPriceCalcTikTok.json', 'tiktokProdActPriceCalcTikTok');
    // await importJsonToFirestore('./prodStockCalcTikTok.json', 'tiktokProdStockCalcTikTok');
}

runImport().then(() => {
    console.log('All imports finished.');
    process.exit();
}).catch(error => {
    console.error('Overall import error:', error);
    process.exit(1);
});
