#ifndef RAILFENCE_CIPHER_HPP
#define RAILFENCE_CIPHER_HPP

#include <string>

// Pure logic (usable/testable outside the socket world).
// Classic zig-zag transposition over `rails` lines. Text is used as-is
// (spaces/punctuation kept); only the ordering changes.
std::string railfenceEncrypt(std::string plain_text, int rails);
std::string railfenceDecrypt(std::string cipher_text, int rails);

// Interactive handler: owns the socket for the whole session.
void run_railfence(int client_fd);

#endif // RAILFENCE_CIPHER_HPP
