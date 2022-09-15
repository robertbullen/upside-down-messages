#!/usr/bin/env bash

# Run this script once before doing any development or execution to ensure all dependencies are
# present on the system.

# Install the latest version of Node.js. This command comes from
#https://github.com/audstanley/NodeJs-Raspberry-Pi.
wget -O - https://raw.githubusercontent.com/audstanley/NodeJs-Raspberry-Pi/master/Install-Node.sh | sudo bash

# Install yarn globally. It is install via npm rather than apt-get because the apt-get version
# depends on an earlier version of Node.js than what was just installed above.
sudo npm install yarn --global
