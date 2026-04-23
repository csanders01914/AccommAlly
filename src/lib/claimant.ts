import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { encrypt } from '@/lib/encryption';

/**
 * Generate a unique 6-digit claimant number
 */
export async function generateClaimantNumber(): Promise<string> {
 let attempts = 0;
 const maxAttempts = 10;

 while (attempts < maxAttempts) {
 // Generate random 6-digit number (100000-999999)
 const number = crypto.randomInt(100000, 999999).toString();

 // Check if it's unique
 const existing = await prisma.claimant.findUnique({
 where: { claimantNumber: number }
 });

 if (!existing) {
 return number;
 }

 attempts++;
 }

 // Fallback: Use timestamp-based number
 const timestamp = Date.now().toString().slice(-6);
 return timestamp;
}

/**
 * Create a hash for name matching (lowercase, trimmed, no special chars)
 */
export function createNameHash(name: string): string {
 const normalized = name.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
 return crypto.createHash('sha256').update(normalized).digest('hex');
}

/**
 * Hash a PIN or passphrase for storage
 */
export async function hashCredential(credential: string): Promise<string> {
 return bcrypt.hash(credential, 10);
}

/**
 * Verify a PIN or passphrase
 */
export async function verifyCredential(credential: string, hash: string): Promise<boolean> {
 return bcrypt.compare(credential, hash);
}

/**
 * Validate PIN format (4-6 digits)
 */
export function validatePin(pin: string): boolean {
 return /^\d{4,6}$/.test(pin);
}

/**
 * Validate passphrase format (12-65 characters)
 */
export function validatePassphrase(passphrase: string): boolean {
 return passphrase.length >= 12 && passphrase.length <= 65;
}

export interface ClaimantData {
 tenantId: string;
 name: string;
 birthdate: Date;
 email?: string;
 phone?: string;
 credentialType: 'PIN' | 'PASSPHRASE';
 credential: string;
}

/**
 * Get or create a claimant based on name + birthdate match within a tenant
 * Returns the claimant and whether it was newly created
 */
export async function getOrCreateClaimant(data: ClaimantData): Promise<{
 claimant: any;
 isNew: boolean;
}> {
 const nameHash = createNameHash(data.name);

 // Check for existing claimant with same name hash + birthdate within the tenant
 const existing = await prisma.claimant.findFirst({
 where: {
 tenantId: data.tenantId,
 nameHash,
 birthdate: data.birthdate
 }
 });

 if (existing) {
 return { claimant: existing, isNew: false };
 }

 // Create new claimant
 const claimantNumber = await generateClaimantNumber();

 // Hash the credential
 const credentialHash = await hashCredential(data.credential);

 const emailHash = data.email
 ? crypto.createHash('sha256').update(data.email.toLowerCase().trim()).digest('hex')
 : null;

 const phoneHash = data.phone
 ? crypto.createHash('sha256').update(data.phone.replace(/\D/g, '')).digest('hex')
 : null;

 const claimant = await prisma.claimant.create({
 data: {
 tenantId: data.tenantId,
 claimantNumber,
 name: encrypt(data.name),
 nameHash,
 birthdate: data.birthdate,
 email: data.email ? encrypt(data.email) : null,
 emailHash,
 phone: data.phone ? encrypt(data.phone) : null,
 phoneHash,
 credentialType: data.credentialType,
 pinHash: data.credentialType === 'PIN' ? credentialHash : null,
 passphraseHash: data.credentialType === 'PASSPHRASE' ? credentialHash : null,
 }
 });

 return { claimant, isNew: true };
}
