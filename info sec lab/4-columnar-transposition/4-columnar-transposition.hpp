#ifndef COLUMNAR_TRANSPOSITION_HPP
#define COLUMNAR_TRANSPOSITION_HPP

#include <string>

// Keyword columnar transposition (incomplete/irregular variant, no padding):
//   - plaintext is written row-by-row into a grid whose width = key length
//   - columns are read out in the order given by ranking the key's characters
//     (alphabetical; equal characters keep their left-to-right order)
//   - the last grid row may be partially filled, so some columns are shorter
//
// Text is used as-is (spaces/punctuation/case preserved); only order changes.
std::string columnarEncrypt(std::string plain_text, std::string key);
std::string columnarDecrypt(std::string cipher_text, std::string key);

// Interactive handler: owns the socket for the whole session.
void run_columnar(int client_fd);

#endif // COLUMNAR_TRANSPOSITION_HPP
