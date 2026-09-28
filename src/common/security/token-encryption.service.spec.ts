import { ConfigService } from "@nestjs/config";

import { TokenEncryptionService } from "@/common/security/token-encryption.service";

describe("TokenEncryptionService", () => {
  it("encrypts with a random IV and decrypts the original value", () => {
    const service = new TokenEncryptionService(new ConfigService({ security: { encryptionKey: "test-key" } }));
    const first = service.encrypt("pk_secret");
    const second = service.encrypt("pk_secret");
    expect(first).not.toBe(second);
    expect(service.decrypt(first)).toBe("pk_secret");
    expect(service.decrypt(second)).toBe("pk_secret");
  });

  it("rejects malformed encrypted values", () => {
    const service = new TokenEncryptionService(new ConfigService({ security: { encryptionKey: "test-key" } }));
    expect(() => service.decrypt("not-encrypted")).toThrow("Unsupported encrypted token format");
  });
});
