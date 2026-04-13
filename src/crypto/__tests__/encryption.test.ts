import { encrypt, decrypt } from '../encryption';

describe('encryption', () => {
  const password = 'super-secret-password';
  const plaintext = 'DATABASE_URL=postgres://localhost:5432/mydb\nAPI_KEY=abc123';

  it('should encrypt and decrypt plaintext successfully', () => {
    const ciphertext = encrypt(plaintext, password);
    const decrypted = decrypt(ciphertext, password);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertexts for the same input', () => {
    const first = encrypt(plaintext, password);
    const second = encrypt(plaintext, password);
    expect(first).not.toBe(second);
  });

  it('should return a base64 encoded string', () => {
    const ciphertext = encrypt(plaintext, password);
    expect(() => Buffer.from(ciphertext, 'base64')).not.toThrow();
  });

  it('should throw when decrypting with wrong password', () => {
    const ciphertext = encrypt(plaintext, password);
    expect(() => decrypt(ciphertext, 'wrong-password')).toThrow();
  });

  it('should throw when ciphertext is tampered', () => {
    const ciphertext = encrypt(plaintext, password);
    const tampered = ciphertext.slice(0, -4) + 'XXXX';
    expect(() => decrypt(tampered, password)).toThrow();
  });

  it('should handle empty string encryption', () => {
    const ciphertext = encrypt('', password);
    const decrypted = decrypt(ciphertext, password);
    expect(decrypted).toBe('');
  });

  it('should handle unicode and special characters', () => {
    const specialPlaintext = 'SECRET=p@$$w0rd!\nUNICODE=héllo wörld\nEMOJI=🔑';
    const ciphertext = encrypt(specialPlaintext, password);
    const decrypted = decrypt(ciphertext, password);
    expect(decrypted).toBe(specialPlaintext);
  });
});
