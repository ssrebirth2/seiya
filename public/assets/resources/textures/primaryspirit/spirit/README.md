# Companion preview images

Copy PNG files from the game client into this folder.

Each file name matches `ArtifactResourcesConfig.preview_icon` (without the `Textures/` prefix).

Example:
- Game: `Textures/PrimarySpirit/Spirit/ItemIcon_128010`
- Here: `ItemIcon_128010.png`

Full list: `scripts/data/companion-assets-manifest.json`

After copying files, run `npm run predev` to refresh the asset manifest.
