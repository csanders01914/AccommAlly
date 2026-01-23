
async function main() {
    const baseUrl = 'http://localhost:3000';
    const ssn = '555-01-9999';

    console.log('1. Creating Case with SSN:', ssn);
    const createRes = await fetch(`${baseUrl}/api/cases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fullName: 'Test User SSN Split',
            email: 'test.split@example.com',
            phone: '555-555-5555',
            accommodationType: 'equipment',
            description: 'Test split SSN storage',
            ssn: ssn
        })
    });

    if (!createRes.ok) {
        console.error('Create failed:', await createRes.text());
        process.exit(1);
    }

    const { caseId } = await createRes.json();
    console.log('Case Created:', caseId);

    console.log('2. Fetching Case (List View)...');
    const listRes = await fetch(`${baseUrl}/api/cases`);
    const listData = await listRes.json();
    const myCase = listData.find((c: any) => c.id === caseId);

    if (myCase) {
        console.log('List View SSN:', myCase.clientSSN);
        if (myCase.clientSSN === '***-**-9999') {
            console.log('PASS: List view shows correct masked SSN.');
        } else {
            console.error('FAIL: List view shows:', myCase.clientSSN);
        }
    } else {
        console.error('FAIL: Case not found in list.');
    }

    console.log('3. Key Reveal...');
    const revealRes = await fetch(`${baseUrl}/api/cases/${caseId}/reveal-ssn`);
    const revealData = await revealRes.json();

    console.log('Revealed SSN:', revealData.ssn);
    if (revealData.ssn === ssn) {
        console.log('PASS: Revealed SSN matches original.');
    } else {
        console.error('FAIL: Revealed SSN mismatch.');
    }
}

main().catch(console.error);
