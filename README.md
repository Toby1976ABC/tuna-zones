# Tuna Zones

Likely feeding zones for bluefin tuna, albacore (germon) and marlin from La Rochelle to San Sebastián, up to about 100 km offshore. Built from live sea temperature, thermal fronts, the shelf edge and canyons, wind-driven upwelling, and your own sightings. French and English, works offline once installed on a phone.

*Version française plus bas.*

## Put it online with GitHub Pages (no coding needed)

1. Sign in at [github.com](https://github.com) and click **New repository** (the **+** at the top right).
2. Name it `tuna-zones`, choose **Public**, and click **Create repository**. (GitHub Pages is free for public repositories; a private one needs a paid plan.)
3. On the new repository page, click **uploading an existing file**.
4. Unzip `tuna-zones-app.zip` on your computer. Open the `tuna-zones-app` folder, select **everything inside it** (including the `js` and `icons` folders), and drag it into the GitHub page. Click **Commit changes**.
   - `.nojekyll` is a hidden file. If your computer hides it, that's fine; the site still works.
5. Go to **Settings → Pages**. Under **Build and deployment**, set **Source** to *Deploy from a branch*, **Branch** to `main` and `/ (root)`, then **Save**.
6. After a minute or two the address appears at the top of that page, like `https://YOUR-NAME.github.io/tuna-zones/`. Open it on your phone.

**Install on a phone:** on iPhone open the address in Safari → Share → *Add to Home Screen*. On Android, Chrome → ⋮ → *Install app*. Open it once while you have signal; after that the app and the last forecast are available offline.

**Updating later:** upload the changed files the same way (GitHub replaces them). Then open `sw.js`, change `tz-v1` to `tz-v2` (and so on), and commit, so phones fetch the new version.

## How it works

- **Forecast:** [Open-Meteo](https://open-meteo.com) Marine API (daily sea temperature and max wave height, 6 days, 228 squares on a 0.125° grid) and Forecast API (wind at 4 coastal points). Called straight from the phone, free, no key. The app refreshes itself when the saved forecast is more than 3 hours old, and the ↻ button forces it. Open-Meteo is free for non-commercial use; check their terms if you sell access to the app.
- **Score:** temperature fit for the species works as a gate, multiplied by a weighted mix of front strength (and whether the front lasts ±1 day), distance to the 200 m shelf edge and the Capbreton / Cap Ferret canyons, upwelling from northerly winds on the Landes and easterlies on the Basque coast, and recent sightings (within ~15 km, fading over ~4 days). Weights can be changed under *Adjust scoring*.
- **Temperature ranges:** bluefin 17–21.5 °C, albacore 16–19 °C, marlin 22 °C and up.
- **Sightings:** stored on each phone only (browser storage). *Export* saves a `.json` file you can send to your crew; *Import* merges theirs. Clearing the browser's data erases the log, so export now and then.
- **Coast:** beach towns from La Rochelle to San Sebastián are drawn on the chart and used for "x km WNW of Mimizan" style positions. Shelf edge, canyon lines and town positions are approximate. **This is not a navigation chart.**

## Files

| File | What it is |
|---|---|
| `index.html` | The page |
| `styles.css` | Look and feel (light and dark mode) |
| `js/i18n.js` | All text in English and French. Edit wording here. |
| `js/geo.js` | Coastline, shelf edge, canyons, beach towns, forecast grid |
| `js/seed.js` | Forecast snapshot from 5 Oct 2026, shown until the first live download |
| `js/app.js` | Scoring, chart, sightings, forecast download |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline use and home-screen install |

To add a beach town, add a line to `TOWNS` in `js/geo.js`: `["Full name","Short label",latitude,longitude,rank]` (rank 1 = always labelled, 3 = labelled if there is room).

To try it on your computer: in this folder run `python3 -m http.server`, then open `http://localhost:8000`.

---

# Tuna Zones (français)

Zones probables de chasse du thon rouge, du germon et du marlin entre La Rochelle et Saint-Sébastien, jusqu'à environ 100 km au large. Calculées à partir de la température de surface en direct, des fronts thermiques, du talus et des canyons, de l'upwelling dû au vent et de vos observations. En français et en anglais, fonctionne hors ligne une fois installée sur le téléphone.

## Mise en ligne avec GitHub Pages (sans coder)

1. Connectez-vous sur [github.com](https://github.com) et cliquez sur **New repository** (le **+** en haut à droite).
2. Nommez-le `tuna-zones`, choisissez **Public**, puis **Create repository**. (GitHub Pages est gratuit pour les dépôts publics ; un dépôt privé demande un abonnement payant.)
3. Sur la page du dépôt, cliquez sur **uploading an existing file**.
4. Décompressez `tuna-zones-app.zip`. Ouvrez le dossier `tuna-zones-app`, sélectionnez **tout son contenu** (y compris les dossiers `js` et `icons`) et glissez-le dans la page GitHub. Cliquez sur **Commit changes**.
   - `.nojekyll` est un fichier caché. S'il n'apparaît pas, ce n'est pas grave, le site fonctionne quand même.
5. Allez dans **Settings → Pages**. Sous **Build and deployment**, mettez **Source** sur *Deploy from a branch*, **Branch** sur `main` et `/ (root)`, puis **Save**.
6. Au bout d'une à deux minutes, l'adresse s'affiche en haut de cette page, du type `https://VOTRE-NOM.github.io/tuna-zones/`. Ouvrez-la sur votre téléphone.

**Installer sur le téléphone :** sur iPhone, ouvrez l'adresse dans Safari → Partager → *Sur l'écran d'accueil*. Sur Android, Chrome → ⋮ → *Installer l'application*. Ouvrez-la une fois avec du réseau ; ensuite l'appli et la dernière prévision restent disponibles hors ligne.

**Mises à jour :** déposez les fichiers modifiés de la même façon (GitHub les remplace). Puis ouvrez `sw.js`, remplacez `tz-v1` par `tz-v2` (et ainsi de suite) et validez, pour que les téléphones récupèrent la nouvelle version.

## Fonctionnement

- **Prévision :** API Marine et Forecast d'[Open-Meteo](https://open-meteo.com) (température de surface et hauteur max des vagues sur 6 jours, 228 cases de 0,125°, vent sur 4 points côtiers). Appelées directement depuis le téléphone, gratuites, sans clé. L'appli se met à jour seule quand la prévision enregistrée a plus de 3 heures ; le bouton ↻ force la mise à jour. Open-Meteo est gratuit pour un usage non commercial ; vérifiez leurs conditions si l'accès à l'appli est payant.
- **Score :** l'accord de température avec l'espèce sert de filtre, multiplié par un mélange pondéré : force du front (et sa durée sur ±1 jour), distance au talus de 200 m et aux canyons de Capbreton et du Cap Ferret, upwelling (vent de nord sur les Landes, d'est sur la côte basque), et observations récentes (dans ~15 km, s'estompant en ~4 jours). Pondérations réglables dans *Réglage du score*.
- **Plages de température :** thon rouge 17–21,5 °C, germon 16–19 °C, marlin 22 °C et plus.
- **Observations :** enregistrées sur chaque téléphone uniquement. *Exporter* crée un fichier `.json` à envoyer à l'équipage ; *Importer* ajoute le leur. Effacer les données du navigateur efface le carnet : exportez de temps en temps.
- **Côte :** les plages et villes de La Rochelle à Saint-Sébastien sont sur la carte et servent aux positions du type « 12 km ONO de Mimizan ». Talus, canyons et positions des villes sont approximatifs. **Ne remplace pas une carte marine.**

Pour ajouter une plage : ajoutez une ligne à `TOWNS` dans `js/geo.js` : `["Nom complet","Nom court",latitude,longitude,rang]` (rang 1 = toujours affiché, 3 = affiché s'il y a la place).
