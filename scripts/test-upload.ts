import fs from 'fs';
import path from 'path';

async function testUpload() {
    const filePath = path.join(__dirname, 'test-doc.txt');
    fs.writeFileSync(filePath, 'This is a test document content for encryption verification. ' + Date.now());

    const formData = new FormData();
    formData.append('fullName', 'Test User');
    formData.append('email', 'test@example.com');
    formData.append('phone', '555-555-5555');
    formData.append('accommodationType', 'equipment');
    formData.append('description', 'Test Description');

    const fileContent = fs.readFileSync(filePath);
    const blob = new Blob([fileContent], { type: 'text/plain' });
    formData.append('supportingDocument', blob, 'test-doc.txt');

    try {
        console.log('Sending upload request...');
        const res = await fetch('http://localhost:3000/api/cases', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        console.log('Upload Status:', res.status);
        console.log('Upload Response:', JSON.stringify(data, null, 2));

        if (data.success && data.caseId) {
            console.log('Fetching case details...');
            const caseRes = await fetch(`http://localhost:3000/api/cases/${data.caseId}`);
            const caseData = await caseRes.json();

            if (caseData.documents && caseData.documents.length > 0) {
                const docId = caseData.documents[0].id;
                console.log('Found document ID:', docId);

                console.log('Downloading document...');
                const downloadRes = await fetch(`http://localhost:3000/api/documents/${docId}/download`);

                if (downloadRes.status === 200) {
                    const downloadedText = await downloadRes.text();
                    console.log('Downloaded Content:', downloadedText);

                    const originalContent = fs.readFileSync(filePath, 'utf-8');
                    if (downloadedText === originalContent) {
                        console.log('✅ VERIFICATION SUCCESS: Content matches!');
                    } else {
                        console.error('❌ VERIFICATION FAILED: Content mismatch!');
                        console.log('Expected:', originalContent);
                        console.log('Received:', downloadedText);
                    }
                } else {
                    console.error('❌ Download failed:', downloadRes.status);
                }
            } else {
                console.warn('⚠️ No documents found on the case.');
            }
        }

    } catch (e) {
        console.error('Error:', e);
    }
}

testUpload();
