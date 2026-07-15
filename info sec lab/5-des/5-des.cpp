#include "5-des.hpp"
#include "net.hpp"

#include <cstdint>
#include <string>
#include <array>
#include <vector>
#include <stdexcept>

// Initial Permutation.
static const int IP[64] = {
    58,50,42,34,26,18,10,2, 60,52,44,36,28,20,12,4,
    62,54,46,38,30,22,14,6, 64,56,48,40,32,24,16,8,
    57,49,41,33,25,17,9,1,  59,51,43,35,27,19,11,3,
    61,53,45,37,29,21,13,5, 63,55,47,39,31,23,15,7
};

// Final Permutation (inverse of IP).
static const int FP[64] = {
    40,8,48,16,56,24,64,32, 39,7,47,15,55,23,63,31,
    38,6,46,14,54,22,62,30, 37,5,45,13,53,21,61,29,
    36,4,44,12,52,20,60,28, 35,3,43,11,51,19,59,27,
    34,2,42,10,50,18,58,26, 33,1,41,9,49,17,57,25
};

// Expansion (32 -> 48).
static const int E[48] = {
    32,1,2,3,4,5, 4,5,6,7,8,9, 8,9,10,11,12,13, 12,13,14,15,16,17,
    16,17,18,19,20,21, 20,21,22,23,24,25, 24,25,26,27,28,29, 28,29,30,31,32,1
};

// P permutation (after S-boxes).
static const int P[32] = {
    16,7,20,21, 29,12,28,17, 1,15,23,26, 5,18,31,10,
    2,8,24,14, 32,27,3,9, 19,13,30,6, 22,11,4,25
};

// Permuted Choice 1 (64 -> 56, drops parity bits).
static const int PC1[56] = {
    57,49,41,33,25,17,9, 1,58,50,42,34,26,18,
    10,2,59,51,43,35,27, 19,11,3,60,52,44,36,
    63,55,47,39,31,23,15, 7,62,54,46,38,30,22,
    14,6,61,53,45,37,29, 21,13,5,28,20,12,4
};

// Permuted Choice 2 (56 -> 48).
static const int PC2[48] = {
    14,17,11,24,1,5, 3,28,15,6,21,10, 23,19,12,4,26,8,
    16,7,27,20,13,2, 41,52,31,37,47,55, 30,40,51,45,33,48,
    44,49,39,56,34,53, 46,42,50,36,29,32
};

// Per-round left rotations of the key halves.
static const int SHIFTS[16] = {1,1,2,2,2,2,2,2,1,2,2,2,2,2,2,1};

// Eight S-boxes.
static const int SBOX[8][64] = {
    {14,4,13,1,2,15,11,8,3,10,6,12,5,9,0,7, 0,15,7,4,14,2,13,1,10,6,12,11,9,5,3,8,
     4,1,14,8,13,6,2,11,15,12,9,7,3,10,5,0, 15,12,8,2,4,9,1,7,5,11,3,14,10,0,6,13},
    {15,1,8,14,6,11,3,4,9,7,2,13,12,0,5,10, 3,13,4,7,15,2,8,14,12,0,1,10,6,9,11,5,
     0,14,7,11,10,4,13,1,5,8,12,6,9,3,2,15, 13,8,10,1,3,15,4,2,11,6,7,12,0,5,14,9},
    {10,0,9,14,6,3,15,5,1,13,12,7,11,4,2,8, 13,7,0,9,3,4,6,10,2,8,5,14,12,11,15,1,
     13,6,4,9,8,15,3,0,11,1,2,12,5,10,14,7, 1,10,13,0,6,9,8,7,4,15,14,3,11,5,2,12},
    {7,13,14,3,0,6,9,10,1,2,8,5,11,12,4,15, 13,8,11,5,6,15,0,3,4,7,2,12,1,10,14,9,
     10,6,9,0,12,11,7,13,15,1,3,14,5,2,8,4, 3,15,0,6,10,1,13,8,9,4,5,11,12,7,2,14},
    {2,12,4,1,7,10,11,6,8,5,3,15,13,0,14,9, 14,11,2,12,4,7,13,1,5,0,15,10,3,9,8,6,
     4,2,1,11,10,13,7,8,15,9,12,5,6,3,0,14, 11,8,12,7,1,14,2,13,6,15,0,9,10,4,5,3},
    {12,1,10,15,9,2,6,8,0,13,3,4,14,7,5,11, 10,15,4,2,7,12,9,5,6,1,13,14,0,11,3,8,
     9,14,15,5,2,8,12,3,7,0,4,10,1,13,11,6, 4,3,2,12,9,5,15,10,11,14,1,7,6,0,8,13},
    {4,11,2,14,15,0,8,13,3,12,9,7,5,10,6,1, 13,0,11,7,4,9,1,10,14,3,5,12,2,15,8,6,
     1,4,11,13,12,3,7,14,10,15,6,8,0,5,9,2, 6,11,13,8,1,4,10,7,9,5,0,15,14,2,3,12},
    {13,2,8,4,6,15,11,1,10,9,3,14,5,0,12,7, 1,15,13,8,10,3,7,4,12,5,6,11,0,14,9,2,
     7,11,4,1,9,12,14,2,0,6,10,13,15,3,5,8, 2,1,14,7,4,10,8,13,15,12,9,0,3,5,6,11}
};

// Permute `src` (which uses `srcBits` bits, MSB first) according to `table`
// of length `n`; table entries are 1-based positions counted from the MSB.
static uint64_t permute(uint64_t src, int srcBits, const int *table, int n) {
    uint64_t out = 0;
    for (int i = 0; i < n; ++i) {
        int bit = (src >> (srcBits - table[i])) & 1ULL;
        out = (out << 1) | bit;
    }
    return out;
}

// Left-rotate `val` (28-bit quantity) by `n` positions.
static uint32_t rotl28(uint32_t val, int n) {
    const uint32_t mask = 0x0FFFFFFFu; // 28 bits
    return ((val << n) | (val >> (28 - n))) & mask;
}

// Build the 16 round subkeys (each 48 bits) from a 64-bit key.
static std::array<uint64_t, 16> keySchedule(uint64_t key) {
    uint64_t permuted = permute(key, 64, PC1, 56); // 56-bit result
    uint32_t C = static_cast<uint32_t>((permuted >> 28) & 0x0FFFFFFFu);
    uint32_t D = static_cast<uint32_t>(permuted & 0x0FFFFFFFu);

    std::array<uint64_t, 16> subkeys{};
    for (int round = 0; round < 16; ++round) {
        C = rotl28(C, SHIFTS[round]);
        D = rotl28(D, SHIFTS[round]);
        uint64_t CD = (static_cast<uint64_t>(C) << 28) | D; // 56 bits
        subkeys[round] = permute(CD, 56, PC2, 48);          // 48-bit subkey
    }
    return subkeys;
}

// The Feistel function f(R, K): expand, XOR key, S-box substitute, permute.
static uint32_t feistel(uint32_t R, uint64_t subkey) {
    uint64_t expanded = permute(R, 32, E, 48) ^ subkey; // 48 bits

    uint32_t sboxOut = 0;
    for (int i = 0; i < 8; ++i) {
        // Extract the i-th 6-bit group (MSB-first).
        int shift = 48 - 6 * (i + 1);
        int six = static_cast<int>((expanded >> shift) & 0x3F);
        int row = ((six & 0x20) >> 4) | (six & 0x01); // outer bits
        int col = (six >> 1) & 0x0F;                   // inner 4 bits
        sboxOut = (sboxOut << 4) | static_cast<uint32_t>(SBOX[i][row * 16 + col]);
    }
    return static_cast<uint32_t>(permute(sboxOut, 32, P, 32));
}

// Core 16-round Feistel network. `decrypt` reverses subkey order.
static uint64_t desCrypt(uint64_t block, uint64_t key, bool decrypt) {
    std::array<uint64_t, 16> subkeys = keySchedule(key);

    uint64_t ip = permute(block, 64, IP, 64);
    uint32_t L = static_cast<uint32_t>((ip >> 32) & 0xFFFFFFFFu);
    uint32_t R = static_cast<uint32_t>(ip & 0xFFFFFFFFu);

    for (int round = 0; round < 16; ++round) {
        uint64_t k = subkeys[decrypt ? (15 - round) : round];
        uint32_t prevR = R;
        R = L ^ feistel(R, k);
        L = prevR;
    }

    // Note the swap: pre-output is R16 L16.
    uint64_t preOutput = (static_cast<uint64_t>(R) << 32) | L;
    return permute(preOutput, 64, FP, 64);
}

uint64_t desEncryptBlock(uint64_t block, uint64_t key) { return desCrypt(block, key, false); }
uint64_t desDecryptBlock(uint64_t block, uint64_t key) { return desCrypt(block, key, true); }

// First 8 bytes of `key` (space-padded / truncated) as a 64-bit big-endian value.
static uint64_t keyToU64(const std::string &key) {
    uint64_t k = 0;
    for (int i = 0; i < 8; ++i) {
        unsigned char b = (i < static_cast<int>(key.size()))
                              ? static_cast<unsigned char>(key[i]) : ' ';
        k = (k << 8) | b;
    }
    return k;
}

static uint64_t bytesToBlock(const unsigned char *p) {
    uint64_t b = 0;
    for (int i = 0; i < 8; ++i) b = (b << 8) | p[i];
    return b;
}

static void blockToBytes(uint64_t block, unsigned char *out) {
    for (int i = 7; i >= 0; --i) { out[i] = static_cast<unsigned char>(block & 0xFF); block >>= 8; }
}

static const char *HEX = "0123456789ABCDEF";

static std::string toHex(const std::string &bytes) {
    std::string out;
    out.reserve(bytes.size() * 2);
    for (unsigned char c : bytes) { out.push_back(HEX[c >> 4]); out.push_back(HEX[c & 0xF]); }
    return out;
}

static int hexVal(char c) {
    if (c >= '0' && c <= '9') return c - '0';
    if (c >= 'a' && c <= 'f') return c - 'a' + 10;
    if (c >= 'A' && c <= 'F') return c - 'A' + 10;
    return -1;
}

static std::string fromHex(const std::string &hex) {
    if (hex.size() % 2 != 0) throw std::runtime_error("hex length must be even");
    std::string out;
    out.reserve(hex.size() / 2);
    for (size_t i = 0; i < hex.size(); i += 2) {
        int hi = hexVal(hex[i]), lo = hexVal(hex[i + 1]);
        if (hi < 0 || lo < 0) throw std::runtime_error("invalid hex digit");
        out.push_back(static_cast<char>((hi << 4) | lo));
    }
    return out;
}

std::string desEncryptText(const std::string &plain_text, const std::string &key) {
    uint64_t k = keyToU64(key);

    // PKCS#5 padding to a multiple of 8 bytes (always adds 1..8 bytes).
    std::string data = plain_text;
    int pad = 8 - static_cast<int>(data.size() % 8);
    data.append(static_cast<size_t>(pad), static_cast<char>(pad));

    std::string cipher;
    cipher.reserve(data.size());
    for (size_t i = 0; i < data.size(); i += 8) {
        uint64_t block = bytesToBlock(reinterpret_cast<const unsigned char *>(data.data() + i));
        uint64_t enc = desEncryptBlock(block, k);
        unsigned char buf[8];
        blockToBytes(enc, buf);
        cipher.append(reinterpret_cast<char *>(buf), 8);
    }
    return toHex(cipher);
}

std::string desDecryptText(const std::string &hex_cipher, const std::string &key) {
    uint64_t k = keyToU64(key);

    std::string cipher = fromHex(hex_cipher);
    if (cipher.empty() || cipher.size() % 8 != 0)
        throw std::runtime_error("ciphertext must be a non-empty multiple of 8 bytes");

    std::string plain;
    plain.reserve(cipher.size());
    for (size_t i = 0; i < cipher.size(); i += 8) {
        uint64_t block = bytesToBlock(reinterpret_cast<const unsigned char *>(cipher.data() + i));
        uint64_t dec = desDecryptBlock(block, k);
        unsigned char buf[8];
        blockToBytes(dec, buf);
        plain.append(reinterpret_cast<char *>(buf), 8);
    }

    // Strip PKCS#5 padding.
    unsigned char pad = static_cast<unsigned char>(plain.back());
    if (pad < 1 || pad > 8 || pad > plain.size())
        throw std::runtime_error("invalid padding");
    plain.resize(plain.size() - pad);
    return plain;
}

void run_des(int client_fd) {
    std::string line, key;

    send_line(client_fd, "DES (ECB, PKCS#5 padding, hex output)");
    send_line(client_fd, "Mode? (e = encrypt, d = decrypt):");
    if (!recv_line(client_fd, line)) return;
    bool decrypt = (!line.empty() && (line[0] == 'd' || line[0] == 'D'));

    send_line(client_fd, "Enter key (first 8 chars used):");
    if (!recv_line(client_fd, key)) return;
    if (key.empty()) {
        send_line(client_fd, "Key must be non-empty. Aborting.");
        return;
    }

    if (decrypt) send_line(client_fd, "Enter hex ciphertext:");
    else         send_line(client_fd, "Enter text:");
    if (!recv_line(client_fd, line)) return;

    try {
        std::string result = decrypt ? desDecryptText(line, key)
                                     : desEncryptText(line, key);
        send_line(client_fd, "Result: " + result);
    } catch (const std::exception &e) {
        send_line(client_fd, std::string("Error: ") + e.what());
    }
}
