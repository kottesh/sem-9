#ifndef CAESAR_CIPHER_HPP
#define CAESAR_CIPHER_HPP

#include <string>

// Pure logic (usable/testable outside the socket world).
char encryptChar(char ch, int shift);
std::string caeserEncrypt(std::string plain_text, int shift);

// Interactive handler: owns the socket for the whole session.
void run_caesar(int client_fd);

#endif // CAESAR_CIPHER_HPP
