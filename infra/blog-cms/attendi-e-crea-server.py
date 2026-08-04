#!/usr/bin/env python3
"""
Aspetta che un tipo di server Hetzner torni disponibile e lo CREA all'istante.

Perche' crea invece di avvisare: le finestre di disponibilita' di CAX11 e CX23 durano secondi.
Trovarla, avvisare qualcuno e aspettare che apra il pannello significa perderla ogni volta.
Lo script guarda, e quando vede, prende.

Prepara anche il firewall (se non c'e') e carica la chiave SSH (se non c'e'), cosi' il server
nasce gia' protetto: creare prima e proteggere dopo lascia una finestra con la porta 22 aperta
al mondo, ed e' esattamente il minuto in cui i bot bussano.

Uso:
    HCLOUD_TOKEN=... python attendi-e-crea-server.py \
        --tipi cx23,cax11 --luoghi fsn1,nbg1,hel1 \
        --nome cms-evalis --chiave-pubblica ~/.ssh/id_ed25519.pub --ip-ssh 1.2.3.4

    # solo guardare, senza creare nulla:
    HCLOUD_TOKEN=... python attendi-e-crea-server.py --tipi cx23,cax11 --secco

Il token si legge da HCLOUD_TOKEN o da --token-file. NON viene mai stampato.
"""

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime

API = "https://api.hetzner.cloud/v1"


def adesso() -> str:
    return datetime.now().strftime("%H:%M:%S")


class Hetzner:
    def __init__(self, token: str):
        self._token = token

    def _chiama(self, percorso: str, metodo: str = "GET", corpo=None):
        req = urllib.request.Request(
            f"{API}{percorso}",
            method=metodo,
            data=json.dumps(corpo).encode() if corpo is not None else None,
            headers={
                "Authorization": f"Bearer {self._token}",
                "Content-Type": "application/json",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read() or "{}")
        except urllib.error.HTTPError as e:
            dettaglio = e.read().decode(errors="replace")[:500]
            if e.code in (401, 403):
                raise SystemExit(
                    "Il token Hetzner non e' valido o non ha i permessi di scrittura.\n"
                    "Serve un token con accesso 'Read & Write' sul progetto."
                )
            raise SystemExit(f"API Hetzner {e.code} su {percorso}: {dettaglio}")

    # --- lettura -----------------------------------------------------------------------
    def tipi_server(self) -> dict:
        """nome del tipo -> id"""
        d = self._chiama("/server_types?per_page=100")
        return {t["name"]: t["id"] for t in d.get("server_types", [])}

    def datacenter(self) -> list:
        return self._chiama("/datacenters?per_page=50").get("datacenters", [])

    def per_nome(self, risorsa: str, nome: str):
        d = self._chiama(f"/{risorsa}?name={nome}")
        elenco = d.get(risorsa, [])
        return elenco[0] if elenco else None

    # --- scrittura ---------------------------------------------------------------------
    def crea_chiave_ssh(self, nome: str, pubblica: str) -> int:
        esistente = self.per_nome("ssh_keys", nome)
        if esistente:
            return esistente["id"]
        return self._chiama("/ssh_keys", "POST", {"name": nome, "public_key": pubblica})["ssh_key"]["id"]

    def crea_firewall(self, nome: str, ip_ssh: list) -> int:
        esistente = self.per_nome("firewalls", nome)
        if esistente:
            return esistente["id"]

        # Il firewall di Hetzner sta PRIMA della macchina: Docker, che si riscrive le regole
        # iptables da solo, non puo' scavalcarlo. E' per questo che il muro vero e' qui e non
        # in ufw sulla VPS.
        regole = [
            {"direction": "in", "protocol": "tcp", "port": "22", "source_ips": ip_ssh,
             "description": "SSH solo dai nostri indirizzi"},
            {"direction": "in", "protocol": "tcp", "port": "80", "source_ips": ["0.0.0.0/0", "::/0"],
             "description": "HTTP (Let's Encrypt e reindirizzamento)"},
            {"direction": "in", "protocol": "tcp", "port": "443", "source_ips": ["0.0.0.0/0", "::/0"],
             "description": "HTTPS (Vercel, il SEO, i controlli)"},
            {"direction": "in", "protocol": "icmp", "source_ips": ["0.0.0.0/0", "::/0"],
             "description": "ping, per capire se la macchina risponde"},
        ]
        return self._chiama("/firewalls", "POST", {"name": nome, "rules": regole})["firewall"]["id"]

    def crea_server(self, nome, tipo, immagine, luogo, id_chiavi, id_firewall) -> dict:
        # `location`, non `datacenter`: dal 16/12/2025 Hetzner ha dismesso il secondo e
        # risponde 422 a chi lo usa ancora.
        corpo = {
            "name": nome,
            "server_type": tipo,
            "image": immagine,
            "location": luogo,
            "ssh_keys": id_chiavi,
            "firewalls": [{"firewall": id_firewall}] if id_firewall else [],
            # IPv4 necessario: Vercel non garantisce di saper uscire verso un'origine
            # solo-IPv6, e una compilazione che non raggiunge il CMS fallisce.
            "public_net": {"enable_ipv4": True, "enable_ipv6": True},
            "labels": {"ruolo": "blog-cms"},
        }
        return self._chiama("/servers", "POST", corpo)


def disponibili(dc: list, id_tipo: int, luoghi: list) -> list:
    """I LUOGHI, tra quelli voluti, dove quel tipo si puo' creare ADESSO.

    La disponibilita' si legge ancora per datacenter, ma la creazione vuole il luogo: sono due
    piani diversi della stessa API, ed e' la confusione che ci e' costata la prima finestra."""
    fuori = []
    for d in dc:
        if id_tipo not in (d.get("server_types") or {}).get("available", []):
            continue
        luogo = d["location"]["name"]
        if luoghi and luogo not in luoghi:
            continue
        if luogo not in fuori:
            fuori.append(luogo)
    return fuori


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--tipi", default="cx23,cax11", help="in ordine di preferenza")
    p.add_argument("--luoghi", default="fsn1,nbg1,hel1", help="vuoto = qualsiasi")
    p.add_argument("--nome", default="cms-evalis")
    p.add_argument("--immagine", default="ubuntu-24.04")
    p.add_argument("--chiave-pubblica", default="", help="file .pub da caricare su Hetzner")
    p.add_argument("--nome-chiave", default="claude-desktop")
    p.add_argument("--ip-ssh", default="", help="CSV degli IP ammessi in SSH")
    p.add_argument("--intervallo", type=int, default=60, help="secondi tra un controllo e l'altro")
    p.add_argument("--scadenza-ore", type=float, default=48)
    p.add_argument("--token-file", default="")
    p.add_argument("--secco", action="store_true", help="guarda e riferisci, non crea niente")
    a = p.parse_args()

    token = os.environ.get("HCLOUD_TOKEN", "")
    if a.token_file:
        token = open(a.token_file, encoding="utf-8").read().strip()
    if not token:
        print("Manca il token: HCLOUD_TOKEN o --token-file", file=sys.stderr)
        return 2

    h = Hetzner(token)
    tipi_voluti = [t.strip() for t in a.tipi.split(",") if t.strip()]
    luoghi = [l.strip() for l in a.luoghi.split(",") if l.strip()]

    catalogo = h.tipi_server()
    sconosciuti = [t for t in tipi_voluti if t not in catalogo]
    if sconosciuti:
        print(f"Tipi che Hetzner non conosce: {sconosciuti}", file=sys.stderr)
        print(f"Disponibili a catalogo: {sorted(catalogo)}", file=sys.stderr)
        return 2

    # tutto quello che serve alla creazione si prepara ORA, mentre c'e' tempo: quando la
    # finestra si apre non si puo' spendere mezzo minuto a caricare una chiave
    id_chiavi, id_firewall = [], None
    if not a.secco:
        if a.chiave_pubblica:
            percorso = os.path.expanduser(a.chiave_pubblica)
            id_chiavi = [h.crea_chiave_ssh(a.nome_chiave, open(percorso, encoding="utf-8").read().strip())]
            print(f"[{adesso()}] chiave SSH pronta ({a.nome_chiave})")
        if a.ip_ssh:
            ip = [x.strip() if "/" in x else f"{x.strip()}/32" for x in a.ip_ssh.split(",") if x.strip()]
            id_firewall = h.crea_firewall("blog-cms", ip)
            print(f"[{adesso()}] firewall pronto (SSH da {', '.join(ip)})")

    limite = time.time() + a.scadenza_ore * 3600
    giro = 0
    print(f"[{adesso()}] in ascolto su {tipi_voluti} nei luoghi {luoghi or 'tutti'} "
          f"(ogni {a.intervallo}s, fino a {a.scadenza_ore}h)")

    while time.time() < limite:
        giro += 1
        dc = h.datacenter()
        for nome_tipo in tipi_voluti:
            liberi = disponibili(dc, catalogo[nome_tipo], luoghi)
            if not liberi:
                continue

            print(f"[{adesso()}] DISPONIBILE: {nome_tipo} in {', '.join(liberi)}")
            if a.secco:
                return 0

            scelto = liberi[0]
            try:
                r = h.crea_server(a.nome, nome_tipo, a.immagine, scelto, id_chiavi, id_firewall)
            except SystemExit as e:
                # la finestra si e' chiusa tra il controllo e la creazione: capita, si riprova
                print(f"[{adesso()}] presa da qualcun altro ({e}); continuo")
                continue

            s = r["server"]
            ipv4 = (s.get("public_net") or {}).get("ipv4", {}).get("ip")
            ipv6 = (s.get("public_net") or {}).get("ipv6", {}).get("ip")
            print("\n" + "=" * 60)
            print(f"SERVER CREATO: {s['name']} ({nome_tipo}) in {scelto}")
            print(f"  IPv4: {ipv4}")
            print(f"  IPv6: {ipv6}")
            print(f"  root password: {r.get('root_password') or '(accesso con chiave SSH)'}")
            print("=" * 60)
            with open("server-creato.json", "w", encoding="utf-8") as f:
                json.dump({"nome": s["name"], "tipo": nome_tipo, "datacenter": scelto,
                           "ipv4": ipv4, "ipv6": ipv6, "quando": datetime.now().isoformat()}, f, indent=2)
            return 0

        if giro % 10 == 1:
            print(f"[{adesso()}] ancora niente (controllo n. {giro})")
        time.sleep(a.intervallo)

    print(f"[{adesso()}] scaduto dopo {a.scadenza_ore}h senza trovare disponibilita'.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
