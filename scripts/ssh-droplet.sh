#!/bin/bash

# SSH to Digital Ocean droplet
# Usage: ./scripts/ssh-droplet.sh

echo "Connecting to Digital Ocean droplet..."
echo "IP: 143.110.229.209"
echo "User: agentis"
echo "Password: vIpKdgJGyk33Gu8"
echo ""

sshpass -p "vIpKdgJGyk33Gu8" ssh agentis@143.110.229.209