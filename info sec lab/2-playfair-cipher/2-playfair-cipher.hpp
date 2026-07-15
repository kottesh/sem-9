#ifndef PLAYFAIR_CIPHER_HPP
#define PLAYFAIR_CIPHER_HPP

#include <string>

// Pure logic (usable/testable outside the socket world).
// Standard Playfair: 5x5 matrix, 'J' merged into 'I', non-letters dropped.
std::string playfairEncrypt(std::string plain_text, std::string key);
std::string playfairDecrypt(std::string cipher_text, std::string key);

// Interactive handler: owns the socket for the whole session.
void run_playfair(int client_fd);

#endif // PLAYFAIR_CIPHER_HPP
