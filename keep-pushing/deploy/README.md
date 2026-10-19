# Installer Keep Pushing sur Proxmox

La version web tourne dans un petit conteneur LXC. Les actualités passent par
`server.mjs`, qui relaie les flux RSS que le navigateur bloquerait.

## 1. Créer le conteneur (interface Proxmox)

1. **local → CT Templates → Templates** : télécharger `debian-12-standard`.
2. **Create CT** :
   - Template : `debian-12-standard`
   - Disque : 8 Go · CPU : 2 cœurs · Mémoire : 2048 Mo
   - Réseau : DHCP (ou une IP fixe, plus pratique pour le téléphone)
3. Avant de le démarrer : **Options → Features** → cocher `nesting` et `keyctl`
   (nécessaires pour Docker dans un LXC).
4. Démarrer le conteneur, ouvrir sa **Console**, se connecter en root.

## 2. Installer l'app (dans la console du conteneur)

```bash
apt-get update && apt-get install -y curl
curl -fsSL https://raw.githubusercontent.com/The-Law59/Claude/keep-pushing/keep-pushing/deploy/install-lxc.sh | bash
```

Le script installe Docker, télécharge le projet dans `/opt/keep-pushing`,
construit l'app (quelques minutes la première fois) et affiche son adresse,
par exemple `http://192.168.1.50:3000`. Relancer la même commande met l'app à jour.

## 3. Traduction des actualités anglaises (facultatif)

Les articles en anglais (Formula1.com, FIA, Reddit) sont traduits en français
par l'API Claude si une clé est fournie. Sans clé, ils restent en anglais.

1. Créer une clé sur https://console.anthropic.com (Settings → API Keys) et,
   par prudence, fixer une limite de dépense mensuelle (Settings → Limits).
2. Dans la console du conteneur :
   ```bash
   echo 'ANTHROPIC_API_KEY=sk-ant-...' > /opt/keep-pushing/keep-pushing/.env
   chmod 600 /opt/keep-pushing/keep-pushing/.env
   ```
   (remplacer `sk-ant-...` par votre clé ; ne la partagez jamais ailleurs).
3. Relancer la commande d'installation pour redémarrer l'app.

Admins (lecture des avis, modération du forum) : ajoutez leurs pseudos dans
le même fichier `.env`, séparés par des virgules, puis relancez l'installation :
```bash
echo 'ADMINS=Quentin' >> /opt/keep-pushing/keep-pushing/.env
```

Chaque article n'est traduit qu'une fois (cache conservé entre les mises à jour).

Le même volume Docker garde aussi les **comptes, amis et paris**
(`/app/data/game.json`). Pour une sauvegarde :
```bash
docker compose -f /opt/keep-pushing/keep-pushing/docker-compose.yml cp keep-pushing:/app/data ./sauvegarde-keep-pushing
```

Météo : les téléphones interrogent directement Open-Meteo (gratuit, sans clé,
pour un usage non commercial ; une version payante est nécessaire si l'app
devient commerciale).

Sauvegardes : le serveur copie chaque jour `game.json` dans
`/app/data/backups/` (14 jours gardés). Pour se protéger aussi d'une panne du
conteneur, activez une sauvegarde planifiée du LXC dans Proxmox
(Datacenter → Sauvegarde → Ajouter). Pour restaurer une copie :
```bash
cd /opt/keep-pushing/keep-pushing
docker compose stop
docker compose run --rm keep-pushing cp data/backups/game-AAAA-MM-JJ.json data/game.json
docker compose start
```

## Surveillance

- `curl http://<IP du conteneur>:3000/api/health` : état du serveur (saison,
  actus, sauvegarde, version, durée de fonctionnement). `docker ps` affiche
  aussi `healthy` / `unhealthy`.
- Les plantages de l'appli et du serveur arrivent dans Réglages → Tableau de
  bord admin (et une notification aux admins à chaque nouvelle erreur).
- Être prévenu si le serveur tombe : lancez Uptime Kuma, fourni dans le
  même fichier, puis ouvrez `http://<IP du conteneur>:3001` :
  ```bash
  cd /opt/keep-pushing/keep-pushing && docker compose --profile monitoring up -d
  ```
  Ajoutez une sonde « HTTP(s) » sur `http://keep-pushing:3000/api/health`
  (toutes les minutes) et une notification (Telegram, e-mail, Discord…).
  Pour surveiller aussi le conteneur Proxmox lui-même, installez plutôt Uptime
  Kuma sur une autre machine (ou un service gratuit comme UptimeRobot si le
  serveur est accessible depuis Internet).

Mot de passe oublié par un joueur : l'app s'arrête une minute, le temps de
lui en générer un nouveau (affiché à l'écran, à lui transmettre) :
```bash
cd /opt/keep-pushing/keep-pushing
docker compose stop
docker compose run --rm keep-pushing node scripts/reset-password.mjs <pseudo>
docker compose start
```

## 4. Sur le téléphone

1. Même Wi-Fi que le serveur : ouvrir `http://<IP du conteneur>:3000`.
2. Ajouter à l'écran d'accueil :
   - iPhone (Safari) : Partager → « Sur l'écran d'accueil »
   - Android (Chrome) : ⋮ → « Ajouter à l'écran d'accueil »

Hors de chez vous, le plus simple et le plus sûr est
[Tailscale](https://tailscale.com) sur le serveur et le téléphone, plutôt
qu'ouvrir un port sur la box.

Les rappels de sessions ne fonctionnent pas dans la version web : ils
arriveront avec l'app installée depuis les stores.
