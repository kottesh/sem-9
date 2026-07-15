#ifndef DES_HPP
#define DES_HPP

#include <cstdint>
#include <string>

// Pure logic (usable/testable outside the socket world).
//
// Textbook DES:
//   - desEncryptBlock / desDecryptBlock operate on a single 64-bit block with a
//     64-bit key (8 parity bits ignored), returning the 64-bit result.
//   - desEncryptText / desDecryptText work on arbitrary text using ECB mode with
//     PKCS#5/#7 padding. The key is the first 8 bytes of `key` (space padded /
//     truncated). Ciphertext is returned as uppercase hex; decryption expects
//     uppercase/lowercase hex and returns the original text.
uint64_t desEncryptBlock(uint64_t block, uint64_t key);
uint64_t desDecryptBlock(uint64_t block, uint64_t key);

std::string desEncryptText(const std::string &plain_text, const std::string &key);
std::string desDecryptText(const std::string &hex_cipher, const std::string &key);

// Interactive handler: owns the socket for the whole session.
void run_des(int client_fd);

#endif // DES_HPP
