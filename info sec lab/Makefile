CXX      := clang++
CXXFLAGS := -std=c++17 -Wall -Wextra -O2

# Auto-discover exercises: each lives in its own folder as
#   <no>-name/<no>-name.cpp (+ .hpp)
# Adding an exercise = drop the folder + register it in server.cpp. No edit here.
EXERCISES := $(wildcard [0-9]*-*/[0-9]*-*.cpp)

# One -I per exercise folder so their headers are found (and net.hpp in root).
INCLUDES  := -I. $(addprefix -I,$(sort $(dir $(EXERCISES))))

all: server client

server: server.cpp $(EXERCISES) net.hpp
	$(CXX) $(CXXFLAGS) $(INCLUDES) -o server server.cpp $(EXERCISES)

client: client.cpp net.hpp
	$(CXX) $(CXXFLAGS) $(INCLUDES) -o client client.cpp

clean:
	rm -f server client

.PHONY: all clean
