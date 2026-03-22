import crypto from 'crypto';
const SALT_KEY = 'GTP8JKnAQbJfEiNEdrooq0yqIqntD8T3';
const IV = 'c4e3Z8kDULMbLqmt';
const encryption_method = 'AES-256-CBC';
export const encrypt = (text: string) => {
    const cipher = crypto.createCipheriv(encryption_method, SALT_KEY, IV);
    let encryptedData = cipher.update(text, "utf-8", "hex");
    encryptedData += cipher.final("hex");
    return encryptedData;
}
export const decrypt = (text: string) => {
    try {
        const decipher = crypto.createDecipheriv(encryption_method, SALT_KEY, IV);
        let decryptedData = decipher.update(text, "hex", "utf-8");
        decryptedData += decipher.final("utf8");
        return decryptedData;
    } catch (err:any) {
        return "";
    }
}
export function md5(input:string) {
  return crypto.createHash('md5').update(input).digest('hex');
}
interface CodeMap {
    [key: string]: string;
}

interface CodeGroup {
    [group: string]: CodeMap;
}
export class CipEncodeDecode {
    private encode_codes: CodeGroup = {
        "A": { "0": "O", "1": "J", "2": "N", "3": "M", "4": "U", "5": "5", "6": "C", "7": "T", "8": "B", "9": "P" },
        "B": { "0": "S", "1": "K", "2": "L", "3": "Y", "4": "P", "5": "0", "6": "I", "7": "V", "8": "H", "9": "X" }
    };

    private decode_codes: CodeGroup = {
        "A": {
            "O": "0",
            "J": "1",
            "N": "2",
            "M": "3",
            "U": "4",
            "5": "5",
            "C": "6",
            "T": "7",
            "B": "8",
            "P": "9"
        },
        "B": {
            "S": "0",
            "K": "1",
            "L": "2",
            "Y": "3",
            "P": "4",
            "0": "5",
            "I": "6",
            "V": "7",
            "H": "8",
            "X": "9"
        }
    };

    /**
     * Encodes a number using a specified or random group from encode_codes.
     * @param number The number to encode (e.g., 153362)
     * @param group The encoding group to use ("A" or "B"), optional
     * @returns The encoded string with group name at the start or empty string if invalid
     */
    encodeNumber(number: number | string, group?: string): string {
        const encode_codes = this.encode_codes;

        // Select random group if none provided
        const selectedGroup = group && encode_codes[group] ? group : ["A", "B"][Math.floor(Math.random() * 2)];

        // Validate group
        if (!encode_codes[selectedGroup]) {
            return "";
        }

        // Convert number to string to process each digit
        const numberStr = String(number);

        // Validate input: ensure it's a non-negative number
        if (!/^\d+$/.test(numberStr)) {
            return "";
        }

        let encoded = selectedGroup;
        // Process each digit
        for (const digit of numberStr.split("")) {
            // Check if digit exists in encode_codes for the group
            if (encode_codes[selectedGroup][digit] !== undefined) {
                encoded += encode_codes[selectedGroup][digit];
            } else {
                return "";
            }
        }

        return encoded;
    }

    /**
     * Decodes an encoded string (e.g., AJ5MMCN) to its original number.
     * @param encoded The encoded string with group name as the first character
     * @returns The decoded number or empty string if invalid
     */
    decodeNumber(encoded: string): number | string {
        const decode_codes = this.decode_codes;

        // Validate input: ensure it's a non-empty string
        if (typeof encoded !== "string" || encoded.length === 0) {
            return "";
        }

        // Extract group from first character
        const group = encoded.slice(0, 1);

        // Validate group
        if (!decode_codes[group]) {
            return "";
        }

        // Get the encoded characters (excluding group)
        const encodedChars = encoded.slice(1);

        // Validate: ensure there are characters to decode
        if (encodedChars.length === 0) {
            return "";
        }

        let decoded = "";
        // Process each character
        for (const char of encodedChars.split("")) {
            // Check if character exists in decode_codes for the group
            if (decode_codes[group][char] !== undefined) {
                decoded += decode_codes[group][char];
            } else {
                return "";
            }
        }

        // Ensure the decoded result is a valid number
        if (!/^\d+$/.test(decoded)) {
            return "";
        }

        // Convert to number (removes leading zeros)
        return parseInt(decoded);
    }
}