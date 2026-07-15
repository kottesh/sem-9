#include "net.hpp"
#include "1-caesar-cipher.hpp"
#include "2-playfair-cipher.hpp"
#include "3-railfence-cipher.hpp"
#include "4-columnar-transposition.hpp"
#include "5-des.hpp"
#include "7-diffie-hellman.hpp"

#include <iostream>
#include <string>
#include <map>
#include <cstring>
#include <cerrno>
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>

// Exercise registry
//
// Each handler owns the socket for the whole interactive session:
//   void handler(int client_fd);
//
// To add a new exercise:
//   1. create <no>-name.{cpp,hpp}
//   2. #include its header above
//   3. add one line to the registry below
using Handler = void (*)(int);

static const std::map<std::string, Handler> registry = {
    {"caesar",   run_caesar},
    {"playfair", run_playfair},
    {"railfence", run_railfence},
    {"columnar", run_columnar},
    {"des", run_des},
    {"diffiehellman", run_diffiehellman},
};

static constexpr int PORT = 6777;

int main() {
    int sockfd = socket(AF_INET, SOCK_STREAM, 0);
    if (sockfd == -1) {
        std::cerr << "Socket creation failed!" << std::endl;
        return 1;
    }

    int opt = 1;
    setsockopt(sockfd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    sockaddr_in server_address{};
    server_address.sin_family = AF_INET;
    server_address.sin_port = htons(PORT);
    server_address.sin_addr.s_addr = INADDR_ANY;

    if (bind(sockfd, (struct sockaddr *)&server_address, sizeof(server_address)) == -1) {
        std::cerr << "Bind failed: " << std::strerror(errno) << std::endl;
        close(sockfd);
        return 1;
    }

    if (listen(sockfd, 1) == -1) {
        std::cerr << "Listen failed: " << std::strerror(errno) << std::endl;
        close(sockfd);
        return 1;
    }

    std::cout << "Server listening on port " << PORT << " ..." << std::endl;
    std::cout << "Available exercises:";
    for (const auto &kv : registry) std::cout << " " << kv.first;
    std::cout << std::endl;

    // One client at a time.
    while (true) {
        sockaddr_in client_address{};
        socklen_t client_len = sizeof(client_address);
        int client_fd = accept(sockfd, (struct sockaddr *)&client_address, &client_len);
        if (client_fd == -1) {
            std::cerr << "Accept failed: " << std::strerror(errno) << std::endl;
            continue;
        }

        std::cout << "Client connected." << std::endl;

        // First line = exercise name.
        std::string exe;
        if (!recv_line(client_fd, exe)) {
            std::cout << "Client sent nothing, closing." << std::endl;
            close(client_fd);
            continue;
        }

        auto it = registry.find(exe);
        if (it == registry.end()) {
            send_line(client_fd, "Unknown exercise: '" + exe + "'");
            std::string names = "Available:";
            for (const auto &kv : registry) names += " " + kv.first;
            send_line(client_fd, names);
            std::cout << "Unknown exercise requested: '" << exe << "'" << std::endl;
        } else {
            std::cout << "Running exercise: '" << exe << "'" << std::endl;
            it->second(client_fd);
        }

        close(client_fd);
        std::cout << "Client disconnected." << std::endl;
    }

    close(sockfd);
    return 0;
}
