#!/bin/bash
# À lancer DANS un conteneur LXC Debian 12 de Proxmox, en root.
# Installe Docker, récupère Keep Pushing et le lance sur le port 3000.
# Relancer le script met l'app à jour.
set -euo pipefail
REPO="${REPO:-https://github.com/The-Law59/Claude.git}"
BRANCH="${BRANCH:-keep-pushing}"
DIR=/opt/keep-pushing

command -v docker >/dev/null || { apt-get update && apt-get install -y curl git && curl -fsSL https://get.docker.com | sh; }
if [ -d "$DIR/.git" ]; then
  # Suit la branche demandée, même si l'installation venait d'une autre branche.
  git -C "$DIR" fetch origin "+refs/heads/$BRANCH:refs/remotes/origin/$BRANCH"
  git -C "$DIR" checkout -B "$BRANCH" "origin/$BRANCH"
else
  git clone -b "$BRANCH" "$REPO" "$DIR"
fi
cd "$DIR/keep-pushing"
docker compose up -d --build
echo "Keep Pushing tourne sur http://$(hostname -I | awk '{print $1}'):3000"
