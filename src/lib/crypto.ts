// NIST FIPS 180-4 compliant cryptographic SHA-256 implementation
// Ensures chain-of-custody evidence hashes are authentic and deterministic across browser and runtime environments.

function rightRotate(value: number, amount: number): number {
  return (value >>> amount) | (value << (32 - amount));
}

export function synchronousSha256(ascii: string): string {
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i = 0;
  let j = 0;
  let result = "";

  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;

  // Initial hash values: first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19
  let hash: number[] = [];
  // Round constants: first 32 bits of the fractional parts of the cube roots of the first 64 primes 2..311
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  hash = hash.slice(0, 8);

  ascii += "\x80"; // Append '1' bit (plus zero padding)
  while ((ascii.length % 64) - 56) ascii += "\x00"; // More zero padding
  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] = (words[i >> 2] || 0) | (j << (((3 - i) % 4) * 8));
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  // Process each 16-word block
  for (j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];

      const s0 =
        i < 16
          ? w[i]
          : (w[i] =
              ((w[i - 16] || 0) +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                (w[i - 7] || 0) +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);

      const s1 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const temp1 =
        (hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + s0) |
        0;
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp2 = (s1 + maj) | 0;

      hash = [
        (temp1 + temp2) | 0,
        hash[0],
        hash[1],
        hash[2],
        (hash[3] + temp1) | 0,
        hash[4],
        hash[5],
        hash[6],
      ];
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? "0" : "") + b.toString(16);
    }
  }
  return result;
}

export async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {
      // fallback to synchronous standard SHA-256
    }
  }
  return synchronousSha256(message);
}

export function synchronousHash(str: string): string {
  return synchronousSha256(str);
}
