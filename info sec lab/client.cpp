#include "net.hpp"

#include <iostream>
#include <string>
#include <cstring>
#include <cerrno>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>

// Generic client.
//   ./client <exe-name> [host]
//
// Sends the exercise name as the first line, then acts as a dumb pipe:
// whatever the server sends is printed; whatever you type is sent back.
// The session ends when the server closes the connection.
static constexpr int PORT = 6777;

int main(int argc, char *argv[]) {
    if (argc < 2) {
        std::cerr << "Usage: " << argv[0] << " <exe-name> [host]" << std::endl;
        return 1;
    }

    const std::string exe = argv[1];
    const std::string host = (argc >= 3) ? argv[2] : "127.0.0.1";

    int sockfd = socket(AF_INET, SOCK_STREAM, 0);
    if (sockfd == -1) {
        std::cerr << "Socket creation failed!" << std::endl;
        return 1;
    }

    sockaddr_in server_address{};
    server_address.sin_family = AF_INET;
    server_address.sin_port = htons(PORT);
    if (inet_pton(AF_INET, host.c_str(), &server_address.sin_addr) <= 0) {
        std::cerr << "Invalid host: " << host << std::endl;
        close(sockfd);
        return 1;
    }

    if (connect(sockfd, (struct sockaddr *)&server_address, sizeof(server_address)) == -1) {
        std::cerr << "Connect failed: " << std::strerror(errno) << std::endl;
        close(sockfd);
        return 1;
    }

    // First line: which exercise we want.
    if (!send_line(sockfd, exe)) {
        std::cerr << "Failed to send exercise name." << std::endl;
        close(sockfd);
        return 1;
    }

    // Turn-based pipe. The server drives the conversation:
    //   - it sends prompt line(s), which we print
    //   - when it asks a question we read one stdin line and send it back
    //
    // Convention: a line ending in ':' is a prompt that expects an answer.
    // Any other line is informational (banner / result) and just printed.
    std::string line;
    while (recv_line(sockfd, line)) {
        bool expects_answer = !line.empty() && line.back() == ':';

        if (expects_answer)
            std::cout << line << ' ' << std::flush;   // prompt: keep answer on same line
        else
            std::cout << line << '\n';                // info/result: end the line

        if (!expects_answer) continue;

        std::string input;
        if (!std::getline(std::cin, input)) break; // EOF from user
        if (!send_line(sockfd, input)) break;
    }

    close(sockfd);
    return 0;
}
