#include "2-playfair-cipher.hpp"
#include "net.hpp"

#include <string>
#include <cctype>
#include <array>
#include <utility>

// Normalise text: uppercase, letters only, 'J' -> 'I'.
static std::string sanitize(const std::string &in) {
    std::string out;
    for (char c : in) {
        if (std::isalpha(static_cast<unsigned char>(c))) {
            char u = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
            if (u == 'J') u = 'I';
            out.push_back(u);
        }
    }
    return out;
}

// Build the 5x5 key matrix and a char->position lookup.
// row/col of each letter is stored so digraph rules are O(1).
static void buildMatrix(const std::string &key,
                        std::array<std::array<char, 5>, 5> &grid,
                        std::array<std::pair<int, int>, 26> &pos) {
    std::array<bool, 26> used{};
    used.fill(false);

    std::string seed = sanitize(key) + "ABCDEFGHIKLMNOPQRSTUVWXYZ"; // no 'J'
    int r = 0, c = 0;
    for (char ch : seed) {
        int idx = ch - 'A';
        if (used[idx]) continue;
        used[idx] = true;
        grid[r][c] = ch;
        pos[idx] = {r, c};
        if (++c == 5) { c = 0; ++r; }
        if (r == 5) break;
    }
}

// Split into digraphs, inserting 'X' between identical pairs and padding
// a trailing lone letter with 'X'.
static std::string toDigraphs(const std::string &text) {
    std::string s = sanitize(text);
    std::string out;
    size_t i = 0;
    while (i < s.size()) {
        char a = s[i];
        char b = (i + 1 < s.size()) ? s[i + 1] : 'X';
        if (a == b) {
            out.push_back(a);
            out.push_back('X');
            i += 1;
        } else {
            out.push_back(a);
            out.push_back(b);
            i += 2;
        }
    }
    if (out.size() % 2 != 0) out.push_back('X');
    return out;
}

// dir = +1 encrypt, -1 decrypt (shift within row/col; swap columns on rectangle).
static std::string transform(const std::string &text, const std::string &key, int dir) {
    std::array<std::array<char, 5>, 5> grid{};
    std::array<std::pair<int, int>, 26> pos{};
    buildMatrix(key, grid, pos);

    std::string digs = toDigraphs(text);
    std::string out;
    for (size_t i = 0; i + 1 < digs.size(); i += 2) {
        auto [r1, c1] = pos[digs[i] - 'A'];
        auto [r2, c2] = pos[digs[i + 1] - 'A'];

        if (r1 == r2) {
            c1 = (c1 + dir + 5) % 5;
            c2 = (c2 + dir + 5) % 5;
        } else if (c1 == c2) {
            r1 = (r1 + dir + 5) % 5;
            r2 = (r2 + dir + 5) % 5;
        } else {
            std::swap(c1, c2);
        }
        out.push_back(grid[r1][c1]);
        out.push_back(grid[r2][c2]);
    }
    return out;
}

std::string playfairEncrypt(std::string plain_text, std::string key) {
    return transform(plain_text, key, +1);
}

std::string playfairDecrypt(std::string cipher_text, std::string key) {
    return transform(cipher_text, key, -1);
}

void run_playfair(int client_fd) {
    std::string line, key;

    send_line(client_fd, "Playfair Cipher (J is merged into I)");
    send_line(client_fd, "Mode? (e = encrypt, d = decrypt):");
    if (!recv_line(client_fd, line)) return;
    bool decrypt = (!line.empty() && (line[0] == 'd' || line[0] == 'D'));

    send_line(client_fd, "Enter key:");
    if (!recv_line(client_fd, key)) return;
    if (sanitize(key).empty()) {
        send_line(client_fd, "Key must contain at least one letter. Aborting.");
        return;
    }

    send_line(client_fd, "Enter text:");
    if (!recv_line(client_fd, line)) return;

    std::string result = decrypt ? playfairDecrypt(line, key)
                                  : playfairEncrypt(line, key);
    send_line(client_fd, "Result: " + result);
}
