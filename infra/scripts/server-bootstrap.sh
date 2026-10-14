#!/usr/bin/env bash
# One-time setup for the test server (Oracle Cloud Always Free, Ampere ARM, Ubuntu 24.04).
# Run as the default "ubuntu" user:  bash server-bootstrap.sh
set -euo pipefail

echo "==> Timezone, updates, basics"
sudo timedatectl set-timezone Africa/Addis_Ababa
sudo apt-get update -y
sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y git curl ca-certificates unattended-upgrades docker.io docker-compose-v2 cron
sudo systemctl enable --now docker cron
sudo usermod -aG docker "$USER"

echo "==> Swap (2 GB) so builds don't run out of memory"
if ! swapon --show | grep -q /swapfile; then
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi

echo "==> Open ports 80 and 443 in the host firewall"
# Oracle Ubuntu images ship iptables rules that reject everything except SSH.
if sudo iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null; then :; else
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent
  sudo netfilter-persistent save
fi

echo "==> App folder"
sudo mkdir -p /opt/dembel-hub /opt/dembel-hub-backups
sudo chown "$USER":"$USER" /opt/dembel-hub /opt/dembel-hub-backups

echo
echo "Done. Log out and back in (so the docker group applies), then follow docs/SERVER_SETUP.md step 5."
