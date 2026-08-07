# TRMNL In Season

[![TRMNL](https://github.com/oneill9/trmnl-in-season/actions/workflows/trmnl.yml/badge.svg)](https://github.com/oneill9/trmnl-in-season/actions/workflows/trmnl.yml)

A self-contained [TRMNL](https://usetrmnl.com/) plugin showing which fruit and vegetables are being harvested domestically this month. The only setting is the user's country.

## Features

- United Kingdom, Ireland, United States, Canada, Australia, and New Zealand
- Separate fruit and vegetable lists using country-local terminology
- Conservative national harvest guides with no imported, stored, or greenhouse-only availability
- Full, half-horizontal, half-vertical, and quadrant layouts
- 22px popularity-ranked full-screen shortlist showing up to 14 fruit and 24 vegetables
- E-ink-friendly produce artwork and a country-specific source QR code
- Abundance-ranked category summaries on compact layouts, with two familiar examples per category
- No runtime API key, external data request, or user data storage

## How it works

The plugin has a required Country dropdown and a bundled, versioned seasonality catalogue. Once per day, its serverless Node.js transform:

1. Reads the selected country and the user's TRMNL timezone.
2. Selects produce whose domestic harvest window includes the current calendar month.
3. Applies the terminology familiar in that country, such as “aubergine,” “eggplant,” “courgette,” “zucchini,” “capsicum,” or “kūmara.”
4. Produces a readable popularity-ranked shortlist for the full layout and seasonal category summaries for smaller layouts.
5. Links the full-screen QR code to the selected country's evidence on the public source guide.

The result is a national guide, not a local crop forecast. Weather, latitude, altitude, cultivar, and growing method can shift a harvest by several weeks. See the [public source guide](https://oneill9.github.io/trmnl-in-season/) or [Data Sources and Methodology](docs/DATA_SOURCES.md) for the evidence policy and source list.

## Install

Clone this repository and push it to a TRMNL account with the official [`trmnlp`](https://github.com/usetrmnl/trmnlp) tool:

```sh
git clone https://github.com/oneill9/trmnl-in-season.git
cd trmnl-in-season
bundle install
bundle exec trmnlp login
bundle exec trmnlp push
```

The first push creates a private plugin and writes its TRMNL ID into `src/settings.yml`. Choose a country in the plugin settings, then add the instance to a device playlist.

## Continuous deployment

The [TRMNL workflow](.github/workflows/trmnl.yml) runs the JavaScript tests and TRMNL lint checks on pull requests and pushes to `main`. After a successful `main` verification, it publishes the plugin with `trmnlp push --force`. GitHub Actions use immutable revisions, and `Gemfile.lock` pins the TRMNL tooling and its Ruby dependencies.

The [GitHub Pages workflow](.github/workflows/pages.yml) publishes the static source guide from `docs/` when its content changes on `main`.

[Dependabot](.github/dependabot.yml) checks GitHub Actions, Bundler, and npm dependencies every Monday. Minor and patch releases are grouped by ecosystem, while major upgrades receive separate pull requests for review.

Add a repository secret named `TRMNL_API_KEY` containing the user API key from the TRMNL account page. The committed plugin ID in `src/settings.yml` ensures deployments update this private plugin instead of creating another one.

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
bundle exec trmnlp serve
```

Then open `http://localhost:4567`. The local preview uses the country and timezone configured in `.trmnlp.yml`.

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
├── .github
│   ├── dependabot.yml
│   └── workflows
│       ├── pages.yml
│       └── trmnl.yml
├── docs
│   ├── DATA_SOURCES.md
│   └── index.html
├── src
│   ├── assets
│   │   ├── fruit-botanical-flat.png
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
    ├── templates.test.js
    ├── transform.test.js
    └── workflow.test.js
```

`src/transform.js` intentionally contains both the data and transform logic. TRMNL uploads a serverless transform as a single self-contained artifact, so the deployed plugin does not depend on auxiliary data files.

## Privacy

The plugin sends no personal information to the project author or any third party. TRMNL stores the selected country as plugin configuration and runs the bundled transform without an external data request.

## License

[MIT](LICENSE)
