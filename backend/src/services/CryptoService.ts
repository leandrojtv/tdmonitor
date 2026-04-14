import crypto from 'crypto';
import { env } from '../config/env';

export class CryptoService {
  private readonly key: Buffer;

  constructor() {
    this.key = Buffer.from(env.encryptionKey, 'utf8');

    if (this.key.length !== 32) {
      throw new Error('ENCRYPTION_KEY deve ter exatamente 32 caracteres (AES-256).');
    }
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(ciphertext: string): string {
    const [ivHex, tagHex, payloadHex] = ciphertext.split(':');

    if (!ivHex || !tagHex || !payloadHex) {
      throw new Error('Formato de ciphertext inválido.');
    }

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(ivHex, 'hex')
    );

    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payloadHex, 'hex')),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  }
}

export const cryptoService = new CryptoService();
