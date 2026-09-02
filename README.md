# TRMNL In Season

[![TRMNL](https://github.com/oneill9/trmnl-in-season/actions/workflows/trmnl.yml/badge.svg)](https://github.com/oneill9/trmnl-in-season/actions/workflows/trmnl.yml)

<p align="center">
  <img src="src/assets/in-season-icon.png" alt="In Season aubergine icon" width="128">
</p>

An [In Season recipe for TRMNL](https://trmnl.com/recipes/407471) that lists fruit and vegetables harvested in the user's country during the current month. It ships with its seasonality data and asks only for the country.

[Install In Season on TRMNL](https://trmnl.com/recipes/407471)

## Features

- Covers the United Kingdom, Ireland, United States, Canada, Australia, and New Zealand
- Uses local names such as "aubergine," "eggplant," "courgette," "zucchini," "capsicum," and "kūmara"
- Omits imported produce and items available only from storage or heated greenhouses
- Supports full, half-horizontal, half-vertical, and quadrant layouts
- Shows every category and matching item in the full layout
- Uses botanical artwork designed for e-ink displays
- Ranks categories by abundance in smaller layouts and gives familiar examples from each category
- Makes no runtime API requests and stores no user data

## How it works

The plugin has a required Country dropdown and a versioned seasonality catalogue. Once per day, TRMNL runs the bundled transform (a single Node.js script) to:

1. Reads the selected country and the user's TRMNL timezone.
2. Selects produce whose domestic harvest window includes the current calendar month.
3. Uses the produce names familiar in that country.
4. Groups all matching produce for the full layout and builds shorter category summaries for smaller layouts.

The result is a national guide, not a local crop forecast. Weather, latitude, altitude, cultivar, and growing method can shift a harvest by several weeks. See the [public source guide](https://oneill9.github.io/trmnl-in-season/) or [Data sources and methodology](docs/DATA_SOURCES.md) for the evidence policy and source list.

## Deploy to TRMNL

This repository deploys the published [In Season recipe](https://trmnl.com/recipes/407471), with ID `407471`. Maintainers use the official [`trmnlp`](https://github.com/usetrmnl/trmnlp) tool:

```sh
git clone https://github.com/oneill9/trmnl-in-season.git
cd trmnl-in-season
bundle install
bundle exec trmnlp login
bundle exec trmnlp push
```

The push updates the plugin identified in `src/settings.yml`. To run this project as a separate private plugin, create or clone a plugin with `trmnlp`, then replace the committed plugin ID with your own. After deployment, choose a country in the plugin settings and add the instance to a device playlist.

## Continuous deployment

The [TRMNL workflow](.github/workflows/trmnl.yml) runs the JavaScript tests and TRMNL lint checks on pull requests and pushes to `main`. If the checks pass on `main`, the workflow publishes the plugin with `trmnlp push --force`. The workflow pins each GitHub Action to an immutable revision. `Gemfile.lock` pins the TRMNL tooling and its Ruby dependencies.

The [GitHub Pages workflow](.github/workflows/pages.yml) publishes the static source guide from `docs/` when its content changes on `main`.

[Dependabot](.github/dependabot.yml) checks GitHub Actions, Bundler, and npm dependencies every Monday. It groups minor and patch releases by ecosystem and opens separate pull requests for major upgrades.

Add a repository secret named `TRMNL_API_KEY` containing the user API key from the TRMNL account page. The committed plugin ID in `src/settings.yml` ensures deployments update the published recipe instead of creating another one.

## Develop

Install the JavaScript test dependency and run the checks:

```sh
npm install
bundle install
npm test
bundle exec trmnlp lint
bundle exec trmnlp build --png
```

Start the live preview server with:

```sh
./scripts/start-server.sh
```

The launcher installs the locked Ruby dependencies when needed. It waits for the server, then opens `http://localhost:4567` in the default macOS browser. The local preview uses the country and timezone in `.trmnlp.yml`.

For static, device-accurate previews without a server, run:

```sh
npm run previews
```

This renders every layout for the current month into `_build/devices/` against the pinned Framework at OG (800x480) and TRMNL X (1040x780) dimensions, in both orientations. It also writes `gallery.html`, which tiles all twelve layout and device combinations in frames sized to the exact device viewport, so media queries behave as they do on real hardware no matter how the browser window is sized.

If Ruby is not installed, use TRMNL's container:

```sh
docker run --rm --pull always \
  --publish 4567:4567 \
  --volume "$PWD:/plugin" \
  trmnl/trmnlp serve
```

## Project structure

```text
.
├── .trmnlp.yml
├── Gemfile
├── Gemfile.lock
├── package.json
├── package-lock.json
├── .github
│   ├── dependabot.yml
│   └── workflows
│       ├── pages.yml
│       └── trmnl.yml
├── docs
│   ├── DATA_SOURCES.md
│   ├── in-season-icon.png
│   └── index.html
├── src
│   ├── assets
│   │   ├── fruit-botanical-flat.png
│   │   ├── in-season-icon.png
│   │   └── vegetables-botanical-flat.png
│   ├── settings.yml
│   ├── transform.js
│   ├── shared.liquid
│   ├── full.liquid
│   ├── half_horizontal.liquid
│   ├── half_vertical.liquid
│   └── quadrant.liquid
└── test
    ├── data.test.js
    ├── dependabot.test.js
    ├── pages.test.js
    ├── recipe.test.js
    ├── templates.test.js
    ├── transform.test.js
    └── workflow.test.js
```

`src/transform.js` intentionally contains both the data and transform logic. TRMNL uploads a serverless transform as a single self-contained artifact, so the deployed plugin does not depend on auxiliary data files.

## Privacy

The plugin sends no personal information to the project author or any third party. TRMNL stores the selected country as plugin configuration and runs the bundled transform without an external data request.

## License

[MIT](LICENSE)
