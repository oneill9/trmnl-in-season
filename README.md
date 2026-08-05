# TRMNL In Season

A self-contained [TRMNL](https://usetrmnl.com/) plugin showing which fruit and vegetables are being harvested domestically this month. The only setting is the user's country.

## Features

- United Kingdom, Ireland, United States, Canada, Australia, and New Zealand
- Separate fruit and vegetable lists using country-local terminology
- Conservative national harvest guides with no imported, stored, or greenhouse-only availability
- Full, half-horizontal, half-vertical, and quadrant layouts
- Popularity-ranked shortlists on compact layouts, with accurate remainder counts
- No hosted service, API key, external runtime request, or user data storage

## How it works

The plugin has a required Country dropdown and a bundled, versioned seasonality catalogue. Once per day, its serverless Node.js transform:

1. Reads the selected country and the user's TRMNL timezone.
2. Selects produce whose domestic harvest window includes the current calendar month.
3. Applies the terminology familiar in that country, such as “aubergine,” “eggplant,” “courgette,” “zucchini,” “capsicum,” or “kūmara.”
4. Produces complete alphabetical lists for the full layout and popularity-ranked shortlists for smaller layouts.

The result is a national guide, not a local crop forecast. Weather, latitude, altitude, cultivar, and growing method can shift a harvest by several weeks. See [Data Sources and Methodology](docs/DATA_SOURCES.md) for the evidence policy and source list.

## Install

Clone this repository and push it to a TRMNL account with the official [`trmnlp`](https://github.com/usetrmnl/trmnlp) tool:

```sh
git clone https://github.com/oneill9/trmnl-in-season.git
cd trmnl-in-season
gem install trmnl_preview
trmnlp login
trmnlp push
```

The first push creates a private plugin and writes its TRMNL ID into `src/settings.yml`. Choose a country in the plugin settings, then add the instance to a device playlist.

## Develop

Install the JavaScript test dependency and run the checks:

```sh
npm install
npm test
trmnlp lint
trmnlp build --png
```

Start the live preview server with:

```sh
trmnlp serve
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
├── docs
│   └── DATA_SOURCES.md
├── src
│   ├── settings.yml
│   ├── transform.js
│   ├── shared.liquid
│   ├── full.liquid
│   ├── half_horizontal.liquid
│   ├── half_vertical.liquid
│   └── quadrant.liquid
└── test
    ├── data.test.js
    ├── transform.test.js
    └── templates.test.js
```

`src/transform.js` intentionally contains both the data and transform logic. TRMNL uploads a serverless transform as a single self-contained artifact, so the deployed plugin does not depend on auxiliary data files.

## Privacy

The plugin sends no personal information to the project author or any third party. TRMNL stores the selected country as plugin configuration and runs the bundled transform without an external data request.

## License

[MIT](LICENSE)
