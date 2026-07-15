#include "4-columnar-transposition.hpp"
#include "net.hpp"

#include <string>
#include <vector>
#include <numeric>
#include <algorithm>

// Return the column indices in the order they must be read out.
// order[k] = the original column that is read k-th.
// Ranking is by key character (ascending); equal characters keep their
// original left-to-right order (stable sort on position).
static std::vector<int> columnOrder(const std::string &key) {
    int cols = static_cast<int>(key.size());
    std::vector<int> order(cols);
    std::iota(order.begin(), order.end(), 0);
    std::stable_sort(order.begin(), order.end(),
                     [&](int a, int b) { return key[a] < key[b]; });
    return order;
}

std::string columnarEncrypt(std::string plain_text, std::string key) {
    int cols = static_cast<int>(key.size());
    if (cols == 0) return plain_text;

    int len = static_cast<int>(plain_text.size());
    std::vector<int> order = columnOrder(key);

    // Read each selected column top-to-bottom. Row r holds indices
    // [r*cols, r*cols + cols); a cell exists only if that index < len.
    std::string out;
    out.reserve(len);
    for (int col : order) {
        for (int idx = col; idx < len; idx += cols) {
            out.push_back(plain_text[idx]);
        }
    }
    return out;
}

std::string columnarDecrypt(std::string cipher_text, std::string key) {
    int cols = static_cast<int>(key.size());
    if (cols == 0) return cipher_text;

    int len = static_cast<int>(cipher_text.size());
    std::vector<int> order = columnOrder(key);

    // Grid geometry for an incomplete last row.
    int fullRows = len / cols;        // rows that are completely filled
    int remainder = len % cols;       // number of columns that get one extra cell
    // A column c has (fullRows + 1) cells if c < remainder, else fullRows.

    // Compute how many characters each original column received, then walk the
    // ciphertext in read order to slice out each column's characters.
    std::vector<std::string> column(cols);
    int pos = 0;
    for (int col : order) {
        int height = fullRows + (col < remainder ? 1 : 0);
        column[col] = cipher_text.substr(pos, height);
        pos += height;
    }

    // Rebuild plaintext by reading the grid row-by-row.
    std::string out;
    out.reserve(len);
    std::vector<int> row(cols, 0); // next unread row index per column
    for (int i = 0; i < len; ++i) {
        int c = i % cols;
        out.push_back(column[c][row[c]++]);
    }
    return out;
}

void run_columnar(int client_fd) {
    std::string line, key;

    send_line(client_fd, "Columnar Transposition Cipher");
    send_line(client_fd, "Mode? (e = encrypt, d = decrypt):");
    if (!recv_line(client_fd, line)) return;
    bool decrypt = (!line.empty() && (line[0] == 'd' || line[0] == 'D'));

    send_line(client_fd, "Enter key:");
    if (!recv_line(client_fd, key)) return;
    if (key.empty()) {
        send_line(client_fd, "Key must be non-empty. Aborting.");
        return;
    }

    send_line(client_fd, "Enter text:");
    if (!recv_line(client_fd, line)) return;

    std::string result = decrypt ? columnarDecrypt(line, key)
                                  : columnarEncrypt(line, key);
    send_line(client_fd, "Result: " + result);
}
