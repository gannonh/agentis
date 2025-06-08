#!/bin/bash
# scripts/secrets-setup.sh
# Initial setup script for SOPS-based secrets management

set -e

echo "🔐 Setting up SOPS-based secrets management..."

# Check if SOPS and Age are installed
command -v sops >/dev/null 2>&1 || {
    echo "❌ SOPS is required but not installed. Install with: brew install sops"
    exit 1
}
command -v age >/dev/null 2>&1 || {
    echo "❌ Age is required but not installed. Install with: brew install age"
    exit 1
}

# Create age keys directory if it doesn't exist
mkdir -p ~/.config/age

# Generate Age key if it doesn't exist
if [ ! -f ~/.config/age/keys.txt ]; then
    echo "🔑 Generating new Age key..."
    age-keygen -o ~/.config/age/keys.txt
    echo "✅ Age key generated at ~/.config/age/keys.txt"
    echo "📝 Your public key is:"
    grep "public key:" ~/.config/age/keys.txt
    echo ""
    echo "⚠️  IMPORTANT: Update .sops.yaml with your public key!"
else
    echo "✅ Age key already exists"
    echo "📝 Your public key is:"
    grep "public key:" ~/.config/age/keys.txt
fi

# Create secrets directories
mkdir -p secrets/dev
mkdir -p secrets/staging
mkdir -p secrets/prod

echo ""
echo "🎯 Next steps:"
echo "1. Update .sops.yaml with your public key"
echo "2. Split your .env files into config and secrets"
echo "3. Encrypt secrets with: sops -e secrets/prod/.env.secrets > secrets/prod/.env.secrets.enc"
echo "4. Use scripts/load-secrets.sh to decrypt and load secrets"
echo ""
echo "✅ Setup complete!"
