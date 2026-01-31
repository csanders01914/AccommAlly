
const BASE_URL = 'http://localhost:8080';

async function verify() {
    console.log('🚀 Starting API Verification...');

    try {
        // 1. Verify Claimants List
        console.log('\n1. Fetching Claimants...');
        const claimantsRes = await fetch(`${BASE_URL}/api/claimants`);
        if (!claimantsRes.ok) throw new Error(`Failed to fetch claimants: ${claimantsRes.status} ${claimantsRes.statusText}`);
        const claimants = await claimantsRes.json();
        console.log(`✅ Fetched ${claimants.length} claimants.`);

        // 2. Verify Claim Families
        console.log('\n2. Fetching Claim Families...');
        const familiesRes = await fetch(`${BASE_URL}/api/claim-families`);
        if (!familiesRes.ok) throw new Error(`Failed to fetch families: ${familiesRes.status} ${familiesRes.statusText}`);
        const families = await familiesRes.json();
        console.log(`✅ Fetched ${families.length} families.`);

        if (families.length > 0) {
            const family = families[0];
            console.log(`   Family ID: ${family.id}`);
            console.log(`   Linked Cases: ${family.cases?.length || 0}`);
            if (family.cases?.length >= 2) {
                console.log('   ✅ Seed created family with linked cases correctly.');
            } else {
                console.log('   ❌ Seed failed to link cases correctly.');
            }
        } else {
            console.log('   ❌ No families found (Seed validation failed).');
        }

        // 3. Create New Claimant
        console.log('\n3. Creating New Claimant...');
        const newClaimant = {
            name: 'Test User',
            birthdate: '1990-01-01',
            email: 'test.user@example.com',
            phone: '555-0199',
            credentialType: 'PIN',
            credential: '1234'
        };

        const createRes = await fetch(`${BASE_URL}/api/claimants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newClaimant)
        });

        if (createRes.ok) {
            const created = await createRes.json();
            console.log('✅ Claimant created successfully.');
            console.log(`   ID: ${created.id}`);
            console.log(`   Claimant Number: ${created.claimantNumber}`);
        } else {
            const err = await createRes.text();
            console.log(`❌ Failed to create claimant: ${createRes.status} - ${err}`);
        }

    } catch (error) {
        console.error('\n❌ Verification Failed:', error);
    }
}

verify();
