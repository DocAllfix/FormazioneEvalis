#!/usr/bin/env bash
# Preparazione della VPS nuova (Ubuntu 24.04) per il CMS del blog.
# Stessa forma di WhistleBlower (deploy/setup-vps.sh). Idempotente: rieseguirlo non fa danni.
#
#   ssh root@<IP> 'bash -s' < infra/blog-cms/setup-vps.sh
#
# Prepara solo la MACCHINA. Lo stack lo avvia installa.sh, dopo aver copiato i file.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "=== CMS del blog — preparazione della macchina ==="

echo "[setup] aggiornamento del sistema…"
apt-get update -q
apt-get upgrade -yq -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold

echo "[setup] pacchetti…"
# gnupg e rsync servono ai backup: senza, il primo cron notturno fallisce e non lo si scopre
apt-get install -yq docker.io docker-compose-v2 git curl fail2ban ufw \
                    gnupg rsync unattended-upgrades
systemctl enable --now docker

# Aggiornamenti di sicurezza automatici. Un WordPress non aggiornato e' il modo piu' comune di
# perdere un server: qui le patch di sistema arrivano da sole, e WP_AUTO_UPDATE_CORE nel
# compose fa lo stesso per WordPress.
echo "[setup] aggiornamenti di sicurezza automatici…"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'CONF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
CONF
systemctl enable --now unattended-upgrades

# UFW: difesa in profondita'. ⚠️ NON e' il muro principale — i container Docker con porte
# pubblicate SCAVALCANO ufw, perche' Docker si riscrive iptables da solo. Il muro vero e' il
# firewall di Hetzner, che sta prima della macchina. Questo copre eventuali servizi host.
echo "[setup] ufw…"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "[setup] fail2ban…"
cat > /etc/fail2ban/jail.local <<'JAIL'
[sshd]
enabled  = true
maxretry = 5
findtime = 600
bantime  = 3600
JAIL
systemctl enable --now fail2ban
systemctl restart fail2ban

# Solo chiave pubblica — ma SOLO se una chiave e' gia' autorizzata, altrimenti ci si chiude
# fuori dalla propria macchina.
if [ -s /root/.ssh/authorized_keys ]; then
  sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
  sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
  # su Ubuntu 24.04 SSH e' avviato dal socket, non come servizio: `reload ssh` fallisce e con
  # set -e porterebbe via tutto il resto della preparazione
  systemctl reload ssh 2>/dev/null \
    || systemctl reload sshd 2>/dev/null \
    || systemctl restart ssh.socket 2>/dev/null \
    || echo "[setup] nota: SSH non ricaricato, la modifica vale al prossimo riavvio" >&2
  echo "[setup] SSH: accesso con password disattivato (solo chiave)"
else
  echo "[setup] ATTENZIONE: nessuna chiave in /root/.ssh/authorized_keys — password lasciata attiva" >&2
fi

# Swap: 4 GB bastano, ma MariaDB e WordPress insieme a un aggiornamento possono avvicinarsi al
# limite, e un OOM che uccide il database a meta' scrittura e' un guaio evitabile.
if [ ! -f /swapfile ]; then
  echo "[setup] swap 2 GB…"
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Chiave della macchina, per parlare con la Storage Box senza password
if [ ! -f /root/.ssh/id_ed25519 ]; then
  ssh-keygen -t ed25519 -f /root/.ssh/id_ed25519 -N '' -C "cms-evalis-backup" >/dev/null
fi

mkdir -p /opt/blog-cms /var/backups/blog-cms
chmod 700 /var/backups/blog-cms

echo
echo "=== Macchina pronta ==="
echo "Chiave pubblica da autorizzare sulla Storage Box (per i backup):"
cat /root/.ssh/id_ed25519.pub
echo
echo "Prossimo passo: copiare i file dello stack in /opt/blog-cms e lanciare installa.sh"
