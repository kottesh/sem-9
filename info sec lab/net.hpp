#ifndef NET_HPP
#define NET_HPP

#include <string>
#include <cstring>
#include <unistd.h>
#include <sys/socket.h>

// Send a string followed by a newline over the socket.
// Returns false if the peer closed / an error occurred.
inline bool send_line(int fd, const std::string &msg) {
    std::string out = msg;
    out.push_back('\n');
    size_t sent = 0;
    while (sent < out.size()) {
        ssize_t n = ::send(fd, out.data() + sent, out.size() - sent, 0);
        if (n <= 0) return false;
        sent += static_cast<size_t>(n);
    }
    return true;
}

// Read a single line (up to '\n') from the socket, one byte at a time.
// The trailing newline is stripped. Returns false on EOF / error
// (i.e. the peer closed the connection with nothing more to read).
inline bool recv_line(int fd, std::string &line) {
    line.clear();
    char c;
    while (true) {
        ssize_t n = ::recv(fd, &c, 1, 0);
        if (n <= 0) {
            // EOF or error: return whatever we have only if non-empty.
            return !line.empty() && n == 0 ? true : false;
        }
        if (c == '\n') break;
        if (c == '\r') continue;      // tolerate CRLF
        line.push_back(c);
    }
    return true;
}

#endif // NET_HPP
