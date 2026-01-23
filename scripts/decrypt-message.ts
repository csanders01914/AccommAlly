
import readline from 'readline';
import crypto from 'crypto';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function decrypt(text: string, keyHex: string): string {
    if (!text) return text;
    try {
        if (!keyHex || keyHex.length !== 64) {
            throw new Error('Invalid Key Length (must be 64 hex chars)');
        }
        const key = Buffer.from(keyHex, 'hex');

        const textParts = text.split(':');
        const ivPart = textParts.shift();
        if (!ivPart) return text;
        const iv = Buffer.from(ivPart, 'hex');
        const encryptedText = Buffer.from(textParts.join(':'), 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (error) {
        return `Decryption Failed: ${error instanceof Error ? error.message : String(error)}`;
    }
}

console.log('--- Manual Message Decryption Tool ---');

rl.question('Enter Encryption Key (64-char hex): ', (keyRaw) => {
    rl.question('Enter Encrypted Text (format iv:content): ', (textRaw) => {
        const key = keyRaw.trim().replace(/^["']|["']$/g, '');
        const text = textRaw.trim();

        console.log(`\n[DEBUG] Input Length: ${text.length}`);

        if (!text) {
            console.error('[ERROR] No text entered.');
            rl.close();
            return;
        }

        if (!text.includes(':')) {
            console.warn('[WARNING] Input does not contain ":". It might look like plain text or invalid format.');
            console.log('Raw Input:', text);
        }

        const result = decrypt(text, key);
        console.log('\n--- Decrypted Message ---');
        console.log(result || '[EMPTY RESULT]');
        console.log('-------------------------');
        rl.close();
    });
});
