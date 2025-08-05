#!/bin/bash

# Install Claude Code globally
npm install -g @anthropic-ai/claude-code

# Install common Python packages
pip install --user black isort pylint pytest requests numpy pandas

# Install common Node.js packages globally
npm install -g typescript ts-node nodemon prettier eslint

# Install Docker Compose (if not already installed)
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    pip install --user docker-compose
fi

# Set up git (if not already configured)
if ! git config --global user.name > /dev/null 2>&1; then
    echo "Git user not configured. You may want to run:"
    echo "git config --global user.name 'Your Name'"
    echo "git config --global user.email 'your.email@example.com'"
    echo ""
    echo "To set up Git authentication, you have a few options:"
    echo "1. VS Code will automatically forward your host Git credentials (recommended)"
    echo "2. Generate a new SSH key: ssh-keygen -t ed25519 -C 'your.email@example.com'"
    echo "3. Use GitHub CLI: gh auth login"
fi

# Test Git access
echo "Testing Git configuration..."
if git config --global user.name > /dev/null 2>&1; then
    echo "✓ Git user configured: $(git config --global user.name)"
    echo "✓ Git email configured: $(git config --global user.email)"
else
    echo "⚠ Git user not configured yet"
fi

# Create common project directories
mkdir -p /workspace/projects
mkdir -p /workspace/scripts

# Test Docker installation
echo "Testing Docker installation..."
docker --version
docker-compose --version || echo "Docker Compose not available"

echo "DevContainer setup complete! 🚀"
echo "Claude Code is installed and ready to use."
echo "Docker is available for container operations."