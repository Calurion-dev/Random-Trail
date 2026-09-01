# RandomParcours

Générateur de parcours aléatoires pour **vélo** (route / VTT) et **course à pied** (route / trail / montagne / campagne) — 100% client, gratuit, open-source, sans backend ni clé API obligatoire.

![RandomParcours](./public/icon.svg)

## Présentation

RandomParcours génère automatiquement des itinéraires depuis un point de départ, selon des contraintes (distance/durée, direction, type de parcours, difficulté, dénivelé max, préférences terrain, POI). L'utilisateur peut régénérer avec un nouveau seed, éditer manuellement les étapes, importer/exporter GPX/KML/SVG, sauvegarder localement et suivre un parcours en mode activité GPS.

Pas de réseau social, pas de coaching, pas de compétition, pas de paiement.

## Fonctionnalités

- Génération automatique (boucle, aller-retour, A→B, étapes, multi-points) via OSRM public
- Régénération aléatoire avec seed
- Édition manuelle : clic carte, drag, suppression d'étapes
- Profil altimétrique (Open-Meteo Elevation) + stats (distance, durée estimée, D+/D-, scores)
- POI best-effort (eau potable, toilettes, abri, banc, viewpoint) via Overpass
- Import GPX/KML, export GPX/KML/SVG/GeoJSON, partage par URL compressée (lz-string)
- Sauvegarde locale IndexedDB (Dexie), préférences localStorage
- Mode activité : suivi GPS, distance/D+ restants, vitesse/allure, cap, alerte hors-parcours, wake lock
- PWA online-first (vite-plugin-pwa) avec cache tiles/app shell
- Thème clair/sombre (filtre Leaflet pour tuiles sombres)
- UI 100% en français, responsive (sidebar/desktop, bottom sheet/mobile)

## Stack

- Vite + React + TypeScript (strict)
- Leaflet (plain, pas react-leaflet) + OSM raster tiles
- Zustand (state), Dexie (IndexedDB), Turf.js (geo), lz-string (partage), clsx
- vite-plugin-pwa, Vitest, TypeScript 5

## Installation

```bash
npm install
```

## Développement

```bash
npm run dev
# http://localhost:5173
```

## Build

```bash
npm run build
npm run preview
```

## Déploiement GitHub Pages

Vite est configuré avec `base: './'` et `HashRouter` pour compatibilité Pages sans config serveur.

```bash
npm run build
# publier le dossier dist/ sur la branche gh-pages (via gh-pages, ou action GitHub)
```

Option action GitHub : build puis `actions/deploy-pages`.

## Utilisation

1. **Choisir départ** : géolocalisation, recherche Nominatim, ou clic carte. Le thème sombre assombrit les tuiles via CSS filter.
2. **Régler contraintes** : sport/sous-type, type de parcours, distance ou durée (distance prioritaire), direction (0-359°), boucles, difficulté, dénivelé max, distance max, terrain, POI.
3. **Générer** : 2-3 candidats sont évalués, le meilleur score global est retenu. **Régénérer** change le seed.
4. **Manuel** : activer “Édition manuelle”, cliquer pour ajouter des étapes, glisser/déplacer, popup pour supprimer.
5. **Importer** : bouton Importer (GPX/KML) — affichage, calcul stats, sauvegarde possible.

## Génération de parcours

1. Normalise distance cible (si durée seule → distance estimée via vitesse par défaut × multiplicateur difficulté / facteur terrain).
2. Génère waypoints candidats autour du départ selon bearing + jitter aléatoire (mulberry32). Boucle : points répartis circulairement ; aller-retour : point à mi-distance ; A-B : point à distance cible ; multi-points : étapes successives.
3. Appelle OSRM `/{bike|foot}/...?overview=full&geometries=geojson&steps=true`, parse GeoJSON, distance, steps.
4. Échantillonne ~120-180 pts, appelle Open-Meteo Elevation, calcule D+/D- (seuil 3 m), profil.
5. Estime durée : course = Naismith `(dist/vitesse)*60*terrain + D+*0.1` ; vélo = vitesse ajustée par pente moyenne `vitesse * diffMult * clamp(1 - grade*5) / terrain`.
6. Scores : difficulté (dist 0-40, D+ 0-40, terrain 0-20) ; global (100 - pénalités distance/élévation + bonus POI/boucle/routage).
7. POI Overpass en bbox élargie, limite 12-20 résultats, insertion optionnelle best-effort.
8. Sélection meilleur candidat respectant contraintes dures.

OSRM public est imparfait pour VTT/trail (profil foot/bike générique) — documenté.

## Mode manuel

- `Boucle` : start → waypoints → start
- `Aller-retour` : idem
- `A→B` : start → waypoints → fin
- `Multi-points/Étapes` : start → waypoints ordonnés → fin

Même pipeline routage/altitude/score.

## Import / Export / Partage

- **Import** : parse GPX (`trkpt`/`wpt`/`rtept`) et KML (`<coordinates>`), calcule D+/D-/distance si manquant, permet sauvegarde/activité.
- **Export GPX** : `<trk>` lineaire ; **KML** : `<LineString>` ; **SVG** : trace normalisée + profil élévation ; **GeoJSON** interne.
- **Partage** : `lz-string` compressToEncodedURIComponent du JSON (title, sport, coords, params) dans `location.hash#share=...`, détecté au chargement.
- **Envoyer vers montre** : tente Web Share API avec fichier GPX, sinon téléchargement GPX (import manuel côté montre — dépend de l'écosystème).

## Mode activité

- Sélectionne parcours généré/sauvegardé
- `watchPosition` + calculs Turf : point le plus proche, distance restante (`length - location`), D+ restant (profil cumulé), cap vers point à ~100 m, off-route si >50 m (vibration si dispo), instruction simple issue d'OSRM (`maneuver`→FR).
- Wake Lock si dispo, sinon warning. Offline : géométrie utilisable, tuiles peut-être indisponibles.
- Simplification : route complète pour affichage/export, simplifiée (~400 pts) pour calculs temps réel.

## Offline / PWA

- `vite-plugin-pwa` : manifest RandomParcours, cache app shell (cache-first), tuiles OSM (cache-first 500 entrées/30j), elevation/geocoding/POI (stale-while-revalidate), routing (network-first, pas de cache persistant pour nouvelles générations).
- Offline prioritaire : shell, parcours sauvegardés (IndexedDB), tuiles déjà vues, suivi géométrie. Pas de génération hors-ligne.

## Limitations GPS / veille écran

- Le web ne garantit pas le suivi en arrière-plan/écran verrouillé comme une app native. Le mode activité requiert l'écran allumé (Wake Lock). Message affiché si indisponible.

## Services externes & attribution

- Tuiles : `https://tile.openstreetmap.org/{z}/{x}/{y}.png` — © OpenStreetMap
- Routage : `https://router.project-osrm.org/route/v1/{profile}/{coords}` — OSRM
- Géocodage : `https://nominatim.openstreetmap.org/search` — Nominatim (débounce, pays=FR, usage modéré)
- POI : `https://overpass-api.de/api/interpreter` — Overpass API
- Altitude : `https://api.open-meteo.com/v1/elevation` — Open-Meteo

Toutes les requêtes ont cache, rate-limit (≥300 ms OSRM), debounce, dégradation gracieuse. L'app ne crash pas si un service est indisponible.

## Limites connues

- Profils OSRM publics limités pour VTT/trail — tracé à vérifier terrain.
- Pas de sync Strava/Google Health sans OAuth backend — stubs `src/lib/integrations/` avec placeholders + export GPX manuel.
- Export SVG simplifié (GPX reste référence montre).
- Web ne garantit pas GPS background/veille.
- Tuiles offline seulement si déjà en cache.

## Améliorations futures

- Profils routage custom (BRouter/Valhalla) pour VTT/trail
- Quality terrain (highway/cycleway) via Overpass plus fin
- Édition ordre étapes par drag-list
- Partage via QR, import GeoJSON
- Mode entraînement (intervalles), météo, offline tiles pack
- Tests E2E (Playwright), CI Pages

## Tests

```bash
npm test
```

Couvre durée, difficulté, score global, ascent, exports GPX/KML/SVG.

## Licence

MIT — libre d'usage, contribution bienvenue.
