#include "3-railfence-cipher.hpp"
#include "net.hpp"

#include <string>
#include <vector>

// Walk the zig-zag and call `visit(rail, index)` for each character position.
// rail bounces 0 -> rails-1 -> 0 ...; with rails <= 1 everything stays on rail 0.
template <typename F>
static void zigzag(int len, int rails, F visit) {
    int rail = 0;
    int dir = 1;
    for (int i = 0; i < len; ++i) {
        visit(rail, i);
        if (rails > 1) {
            if (rail == 0) dir = 1;
            else if (rail == rails - 1) dir = -1;
            rail += dir;
        }
    }
}

std::string railfenceEncrypt(std::string plain_text, int rails) {
    if (rails <= 1) return plain_text;

    std::vector<std::string> lines(rails);
    zigzag(static_cast<int>(plain_text.size()), rails,
           [&](int rail, int i) { lines[rail].push_back(plain_text[i]); });

    std::string out;
    for (const std::string &line : lines) out += line;
    return out;
}

std::string railfenceDecrypt(std::string cipher_text, int rails) {
    if (rails <= 1) return cipher_text;

    int len = static_cast<int>(cipher_text.size());

    // First pass: mark which rail each position belongs to.
    std::vector<int> rail_of(len);
    zigzag(len, rails, [&](int rail, int i) { rail_of[i] = rail; });

    // Fill the ciphertext into the rails in reading order (rail by rail).
    std::vector<std::string> lines(rails);
    {
        int pos = 0;
        for (int r = 0; r < rails; ++r)
            for (int i = 0; i < len; ++i)
                if (rail_of[i] == r) lines[r].push_back(cipher_text[pos++]);
    }

    // Second pass: walk the zig-zag again, popping from each rail in order.
    std::vector<int> idx(rails, 0);
    std::string out(len, '\0');
    zigzag(len, rails, [&](int rail, int i) { out[i] = lines[rail][idx[rail]++]; });
    return out;
}

void run_railfence(int client_fd) {
    std::string line;

    send_line(client_fd, "Rail Fence Cipher");
    send_line(client_fd, "Mode? (e = encrypt, d = decrypt):");
    if (!recv_line(client_fd, line)) return;
    bool decrypt = (!line.empty() && (line[0] == 'd' || line[0] == 'D'));

    send_line(client_fd, "Enter number of rails:");
    if (!recv_line(client_fd, line)) return;
    int rails = 0;
    try {
        rails = std::stoi(line);
    } catch (...) {
        send_line(client_fd, "Invalid rail count. Aborting.");
        return;
    }
    if (rails < 1) {
        send_line(client_fd, "Rails must be >= 1. Aborting.");
        return;
    }

    send_line(client_fd, "Enter text:");
    if (!recv_line(client_fd, line)) return;

    std::string result = decrypt ? railfenceDecrypt(line, rails)
                                  : railfenceEncrypt(line, rails);
    send_line(client_fd, "Result: " + result);
}
