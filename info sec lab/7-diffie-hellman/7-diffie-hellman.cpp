#include "7-diffie-hellman.hpp"
#include "net.hpp"

#include <cstdint>
#include <string>
#include <random>
#include <cctype>
#include <stdexcept>

uint64_t dhModPow(uint64_t base, uint64_t exp, uint64_t mod) {
    if (mod == 1) return 0;
    unsigned __int128 result = 1;
    unsigned __int128 b = base % mod;
    while (exp > 0) {
        if (exp & 1ULL) result = (result * b) % mod;
        b = (b * b) % mod;
        exp >>= 1;
    }
    return static_cast<uint64_t>(result);
}

bool dhIsPrime(uint64_t n) {
    if (n < 2) return false;
    for (uint64_t p : {2ULL, 3ULL, 5ULL, 7ULL, 11ULL, 13ULL, 17ULL, 19ULL, 23ULL,
                       29ULL, 31ULL, 37ULL}) {
        if (n == p) return true;
        if (n % p == 0) return false;
    }
    uint64_t d = n - 1;
    int r = 0;
    while ((d & 1) == 0) { d >>= 1; ++r; }
    for (uint64_t a : {2ULL, 3ULL, 5ULL, 7ULL, 11ULL, 13ULL, 17ULL, 19ULL, 23ULL,
                       29ULL, 31ULL, 37ULL}) {
        if (a % n == 0) continue;
        uint64_t x = dhModPow(a, d, n);
        if (x == 1 || x == n - 1) continue;
        bool composite = true;
        for (int i = 0; i < r - 1; ++i) {
            x = dhModPow(x, 2, n);
            if (x == n - 1) { composite = false; break; }
        }
        if (composite) return false;
    }
    return true;
}

uint64_t dhPublicValue(uint64_t g, uint64_t secret, uint64_t p) {
    return dhModPow(g, secret, p);
}

uint64_t dhSharedSecret(uint64_t otherPublic, uint64_t mySecret, uint64_t p) {
    return dhModPow(otherPublic, mySecret, p);
}

static bool recvU64(int fd, uint64_t &out) {
    std::string line;
    if (!recv_line(fd, line)) return false;
    try {
        size_t pos = 0;
        unsigned long long v = std::stoull(line, &pos);
        while (pos < line.size() && std::isspace(static_cast<unsigned char>(line[pos]))) ++pos;
        if (pos != line.size()) return false;
        out = static_cast<uint64_t>(v);
        return true;
    } catch (...) {
        return false;
    }
}

void run_diffiehellman(int client_fd) {
    send_line(client_fd, "Diffie-Hellman Key Exchange");
    send_line(client_fd, "You are Alice; the server is Bob. Nobody sends their private number.");

    // Public parameters: prime modulus p and generator g.
    uint64_t p = 0, g = 0;
    send_line(client_fd, "Enter a prime modulus p (e.g. 23):");
    if (!recvU64(client_fd, p)) { send_line(client_fd, "Invalid number. Aborting."); return; }
    if (!dhIsPrime(p) || p < 5) {
        send_line(client_fd, "p must be a prime >= 5. Aborting.");
        return;
    }

    send_line(client_fd, "Enter a generator g (e.g. 5):");
    if (!recvU64(client_fd, g)) { send_line(client_fd, "Invalid number. Aborting."); return; }
    if (g < 2 || g >= p) {
        send_line(client_fd, "g must satisfy 2 <= g < p. Aborting.");
        return;
    }

    send_line(client_fd, "Public parameters agreed: p = " + std::to_string(p) +
                             ", g = " + std::to_string(g));

    // Alice's private secret a (kept on her side; server never stores it).
    uint64_t a = 0;
    send_line(client_fd, "Enter YOUR private secret a (1 < a < p):");
    if (!recvU64(client_fd, a)) { send_line(client_fd, "Invalid number. Aborting."); return; }
    if (a <= 1 || a >= p) {
        send_line(client_fd, "a must satisfy 1 < a < p. Aborting.");
        return;
    }

    // Alice's public value.
    uint64_t A = dhPublicValue(g, a, p);
    send_line(client_fd, "Your public value  A = g^a mod p = " + std::to_string(A));

    // Bob (the server) picks his own private secret b at random.
    std::random_device rd;
    std::mt19937_64 gen(rd());
    std::uniform_int_distribution<uint64_t> dist(2, p - 2);
    uint64_t b = dist(gen);
    uint64_t B = dhPublicValue(g, b, p);
    send_line(client_fd, "Bob picks a private secret and sends his public value.");
    send_line(client_fd, "Bob's public value B = g^b mod p = " + std::to_string(B));

    // Both sides derive the same shared secret.
    uint64_t aliceSecret = dhSharedSecret(B, a, p); // B^a mod p
    uint64_t bobSecret = dhSharedSecret(A, b, p);   // A^b mod p

    send_line(client_fd, "You compute  s = B^a mod p = " + std::to_string(aliceSecret));
    send_line(client_fd, "Bob computes s = A^b mod p = " + std::to_string(bobSecret));

    if (aliceSecret == bobSecret) {
        send_line(client_fd, "Shared secret established: " + std::to_string(aliceSecret));
    } else {
        send_line(client_fd, "Mismatch! Something went wrong.");
    }
}
