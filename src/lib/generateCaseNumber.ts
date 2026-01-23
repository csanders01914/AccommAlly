/**
 * Claim Type Codes for AccessAlly
 * - AR: Accommodation Request
 * - MT: Meeting
 * - FU: Follow-Up
 * - DL: Deadline
 * - OT: Other
 */
export type ClaimType = 'AR' | 'MT' | 'FU' | 'DL' | 'OT';

// Alias for backwards compatibility
export type CaseType = ClaimType;

/**
 * Converts a number to a base-36 string (0-9, A-Z) and ensures uppercase
 */
function toBase36Upper(num: number): string {
    return num.toString(36).toUpperCase();
}

/**
 * Generates a unique alphanumeric Claim Number for AccessAlly records.
 * 
 * Format: AA[TIMESTAMP]-[SEQ][TYPE]
 * Example: "AA27YWV47-001AR"
 * 
 * The timestamp portion is encoded using base-36 (0-9, A-Z) from the exact
 * millisecond timestamp when the claim was created, ensuring uniqueness
 * and traceability while keeping the format short and readable.
 * 
 * @param options - Configuration options
 * @param options.date - The date/time for the claim (defaults to current time)
 * @param options.sequence - 3-digit sequence number (1-999, padded to 3 digits)
 * @param options.type - Claim type code (AR, MT, FU, DL, OT)
 * @returns Formatted claim number string (e.g., "AA27YWV47-001AR")
 */
export function generateClaimNumber(options: {
    date?: Date;
    sequence: number;
    type: ClaimType;
}): string {
    const {
        date = new Date(),
        sequence,
        type,
    } = options;

    // Validate sequence
    if (sequence < 1 || sequence > 999) {
        throw new Error('Sequence must be between 1 and 999');
    }

    // Get timestamp in milliseconds and convert to base-36
    const timestamp = date.getTime();
    const encodedTimestamp = toBase36Upper(timestamp);

    // Pad sequence to 3 digits
    const sequenceString = sequence.toString().padStart(3, '0');

    // Construct the claim number: AA[TIMESTAMP]-[SEQ][TYPE]
    return `AA${encodedTimestamp}-${sequenceString}${type}`;
}

/**
 * Legacy function - redirects to generateClaimNumber for backwards compatibility
 * @deprecated Use generateClaimNumber instead
 */
export function generateCaseNumber(options: {
    date?: Date;
    sequence: number;
    type: ClaimType;
    orgPrefix?: string;
}): string {
    return generateClaimNumber({
        date: options.date,
        sequence: options.sequence,
        type: options.type,
    });
}

/**
 * Parses a claim number string back into its components
 * Supports both new format (AA...) and legacy format (ORG-...)
 * 
 * @param claimNumber - The claim number string to parse
 * @returns Parsed components or null if invalid format
 */
export function parseClaimNumber(claimNumber: string): {
    prefix: string;
    dateTime: Date;
    sequence: number;
    type: ClaimType;
} | null {
    // New format: AA[BASE36_TIMESTAMP]-[SEQ][TYPE]
    const newFormatRegex = /^(AA)([A-Z0-9]+)-(\d{3})([A-Z]{2})$/;
    const newMatch = claimNumber.match(newFormatRegex);

    if (newMatch) {
        const [, prefix, encodedTimestamp, sequenceStr, type] = newMatch;

        // Decode base-36 timestamp back to milliseconds
        const timestamp = parseInt(encodedTimestamp, 36);
        const dateTime = new Date(timestamp);

        return {
            prefix,
            dateTime,
            sequence: parseInt(sequenceStr, 10),
            type: type as ClaimType,
        };
    }

    // Legacy format: [ORG]-[MMDDYYHHMMSS]-[SEQ]-[TYPE]
    const legacyRegex = /^([A-Z]+)-(\d{12})-(\d{3})-([A-Z]{2})$/;
    const legacyMatch = claimNumber.match(legacyRegex);

    if (legacyMatch) {
        const [, orgPrefix, dateTimeStr, sequenceStr, type] = legacyMatch;

        // Parse date: MMDDYYHHMMSS
        const month = parseInt(dateTimeStr.slice(0, 2), 10) - 1; // 0-indexed
        const day = parseInt(dateTimeStr.slice(2, 4), 10);
        const year = parseInt(dateTimeStr.slice(4, 6), 10) + 2000; // Assuming 2000s
        const hours = parseInt(dateTimeStr.slice(6, 8), 10);
        const minutes = parseInt(dateTimeStr.slice(8, 10), 10);
        const seconds = parseInt(dateTimeStr.slice(10, 12), 10);

        const dateTime = new Date(year, month, day, hours, minutes, seconds);

        return {
            prefix: orgPrefix,
            dateTime,
            sequence: parseInt(sequenceStr, 10),
            type: type as ClaimType,
        };
    }

    return null;
}

/**
 * Legacy function - redirects to parseClaimNumber for backwards compatibility
 * @deprecated Use parseClaimNumber instead
 */
export function parseCaseNumber(caseNumber: string): {
    orgPrefix: string;
    dateTime: Date;
    sequence: number;
    type: CaseType;
} | null {
    const result = parseClaimNumber(caseNumber);
    if (!result) return null;

    return {
        orgPrefix: result.prefix,
        dateTime: result.dateTime,
        sequence: result.sequence,
        type: result.type,
    };
}

/**
 * Generates the next sequence number for a given date
 * This is a helper that should be called with existing case count
 * 
 * @param existingCount - Number of existing claims for this date/time window
 * @returns Next available sequence number
 */
export function getNextSequence(existingCount: number): number {
    return existingCount + 1;
}

/**
 * Generates a random unique 6-digit Claimant ID.
 * Example: "847291"
 */
export function generateClaimantId(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Parses a DCN (Document Control Number) back to its creation timestamp
 * DCN format: milliseconds since epoch (e.g., "1705701234567")
 * 
 * @param dcn - The DCN string to parse
 * @returns Date object or null if invalid
 */
export function parseDCN(dcn: string): Date | null {
    // Check if it's a 17-digit timestamp (YYYYMMDDHHmmssSSS)
    if (/^\d{17}$/.test(dcn)) {
        const year = parseInt(dcn.substring(0, 4), 10);
        const month = parseInt(dcn.substring(4, 6), 10) - 1; // 0-indexed
        const day = parseInt(dcn.substring(6, 8), 10);
        const hour = parseInt(dcn.substring(8, 10), 10);
        const minute = parseInt(dcn.substring(10, 12), 10);
        const second = parseInt(dcn.substring(12, 14), 10);
        const ms = parseInt(dcn.substring(14, 17), 10);
        return new Date(year, month, day, hour, minute, second, ms);
    }

    // Check if it's the 13-digit timestamp format (milliseconds since epoch)
    if (/^\d{13}$/.test(dcn)) {
        const timestamp = parseInt(dcn, 10);
        return new Date(timestamp);
    }

    // Legacy format: DCN-YYYY-XXXXX - return null (no timestamp info)
    if (/^DCN-\d{4}-\d{5}$/.test(dcn)) {
        return null;
    }

    return null;
}

/**
 * Unified lookup function to get creation time from either a claim number or DCN
 * 
 * @param identifier - Either a claim number (AA...) or DCN (timestamp)
 * @returns Object with type, creationTime, and parsed details
 */
export function lookupCreationTime(identifier: string): {
    type: 'claim_number' | 'dcn' | 'unknown';
    creationTime: Date | null;
    details: Record<string, any>;
} {
    const trimmed = identifier.trim().toUpperCase();

    // Check if it's a claim number (starts with AA)
    if (trimmed.startsWith('AA')) {
        const parsed = parseClaimNumber(trimmed);
        if (parsed) {
            return {
                type: 'claim_number',
                creationTime: parsed.dateTime,
                details: {
                    prefix: parsed.prefix,
                    sequence: parsed.sequence,
                    claimType: parsed.type,
                    formatted: trimmed
                }
            };
        }
    }

    // Check if it's a DCN (all digits)
    if (/^\d+$/.test(trimmed)) {
        const creationTime = parseDCN(trimmed);
        if (creationTime && !isNaN(creationTime.getTime())) {
            return {
                type: 'dcn',
                creationTime,
                details: {
                    rawTimestamp: trimmed,
                    formatted: trimmed
                }
            };
        }
    }

    return {
        type: 'unknown',
        creationTime: null,
        details: { input: identifier }
    };
}
