#ifndef DIFFIE_HELLMAN_HPP
#define DIFFIE_HELLMAN_HPP

#include <cstdint>
#include <string>

// Pure logic (usable/testable outside the socket world).
// Modular exponentiation base^exp mod mod, overflow-safe for 64-bit moduli.
uint64_t dhModPow(uint64_t base, uint64_t exp, uint64_t mod);

bool dhIsPrime(uint64_t n);

// A generator's public value: g^secret mod p.
uint64_t dhPublicValue(uint64_t g, uint64_t secret, uint64_t p);

// The shared secret from the other party's public value: their^mine mod p.
uint64_t dhSharedSecret(uint64_t otherPublic, uint64_t mySecret, uint64_t p);

// Interactive handler: the server plays Bob, the connected client plays Alice.
void run_diffiehellman(int client_fd);

#endif // DIFFIE_HELLMAN_HPP
