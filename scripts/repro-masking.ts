
process.env.ENCRYPTION_KEY = "b8fe57c6c406205d1502421396245367b8fe57c6c406205d1502421396245367";
import { encrypt, decrypt } from '../src/lib/encryption';

function maskSSN(decrypted: string): string {
    // Remove dashes and spaces to ensure we get the actual last digits
    const clean = decrypted.replace(/[^a-zA-Z0-9]/g, '');
    const last4 = clean.length > 4 ? clean.slice(-4) : clean;
    // Fallback to '0000' only if empty
    const displayLast4 = last4 || '0000';
    return `***-**-${displayLast4}`;
}

async function main() {
    const ssnWithDashes = '123-45-6789';
    const encrypted = encrypt(ssnWithDashes);
    const decrypted = decrypt(encrypted);

    console.log('Original:', ssnWithDashes);
    console.log('Decrypted:', decrypted);
    console.log('Masked:', maskSSN(decrypted));

    const ssnNoDashes = '987654321';
    console.log('No Dashes - Masked:', maskSSN(ssnNoDashes));

    const ssnTrailingDash = '123-45-6789-';
    console.log('Trailing Dash - Masked:', maskSSN(ssnTrailingDash));
}

main().catch(console.error);
