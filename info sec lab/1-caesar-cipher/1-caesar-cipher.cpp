#include "1-caesar-cipher.hpp"
#include "net.hpp"

#include <string>
#include <cctype>

char encryptChar(char ch, int shift) {
    if (std::isupper(static_cast<unsigned char>(ch))) {
        return static_cast<char>('A' + ((ch - 'A' + shift + 26) % 26));
    } else if (std::islower(static_cast<unsigned char>(ch))) {
        return static_cast<char>('a' + ((ch - 'a' + shift + 26) % 26));
    }
    return ch;
}

std::string caeserEncrypt(std::string plain_text, int shift) {
    std::string cipher_text;
    for (char ch : plain_text) {
        cipher_text.push_back(encryptChar(ch, shift));
    }
    return cipher_text;
}

void run_caesar(int client_fd) {
    std::string line;

    send_line(client_fd, "Caesar Cipher");
    send_line(client_fd, "Mode? (e = encrypt, d = decrypt):");
    if (!recv_line(client_fd, line)) return;
    bool decrypt = (!line.empty() && (line[0] == 'd' || line[0] == 'D'));

    send_line(client_fd, "Enter shift value:");
    if (!recv_line(client_fd, line)) return;
    int shift = 0;
    try {
        shift = std::stoi(line);
    } catch (...) {
        send_line(client_fd, "Invalid shift value. Aborting.");
        return;
    }
    if (decrypt) shift = -shift;

    send_line(client_fd, "Enter text:");
    if (!recv_line(client_fd, line)) return;

    std::string result = caeserEncrypt(line, shift);
    send_line(client_fd, "Result: " + result);
}
