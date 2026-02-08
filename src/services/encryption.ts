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