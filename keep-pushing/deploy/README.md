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

Chaque article n'est traduit qu'une fois (cache conservé entre les mises à jour).

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
