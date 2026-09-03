# In Season

> In Season is a TRMNL recipe that shows fruit and vegetables in season for the selected country and current calendar month.

The [project website](https://oneill9.github.io/trmnl-in-season/) is a source and methodology guide. The recipe runs on TRMNL; the website is not a live produce lookup service.

## Set up the recipe

Install [In Season from the TRMNL recipe page](https://trmnl.com/recipes/407471), select a country and add the recipe instance to your device's playlist.

The supported countries are United Kingdom, Ireland, United States, Canada, Australia and New Zealand. Produce names follow local usage, such as aubergine or eggplant, courgette or zucchini, and kūmara.

The daily transform selects the calendar month using the user's TRMNL timezone. It reads a bundled catalogue, with no runtime API requests. The recipe supports full, half-horizontal, half-vertical and quadrant layouts. The full layout shows all matching produce; smaller layouts prioritise familiar examples from the most abundant categories.

## What "in season" means

The catalogue describes domestic fresh harvest. It does not describe everything available in shops. Imports, storage-only availability and crops available only through heated greenhouses or protected growing do not establish a harvest month.

The catalogue uses culinary fruit and vegetable categories. Tomatoes, peppers, cucumbers, aubergines and squash appear as vegetables. It excludes mushrooms, herbs, nuts, grains, dried pulses and rhubarb.

Country-wide entries use common harvest windows across major producing regions. A crop growing somewhere in a large country is not enough to count it as widely in season. Weather, latitude, altitude, variety and growing method can move harvest dates by several weeks.

## Evidence and interpretation

The [data sources guide](https://oneill9.github.io/trmnl-in-season/DATA_SOURCES.md) records the evidence and inclusion rules. It prefers government guidance, national horticultural organisations and produce boards. An entry needs one detailed authoritative source or two reputable agricultural or public-sector sources.

The catalogue rounds evidence to whole months. When sources disagree, it uses the shorter overlapping harvest window and removes storage, frozen, dried and greenhouse-only availability.

Country evidence is linked from the public guide:

- [United Kingdom](https://oneill9.github.io/trmnl-in-season/#united-kingdom), including RHS and Worcestershire County Council.
- [Ireland](https://oneill9.github.io/trmnl-in-season/#ireland), including Bord Bia.
- [United States](https://oneill9.github.io/trmnl-in-season/#united-states), including the USDA seasonal produce guide.
- [Canada](https://oneill9.github.io/trmnl-in-season/#canada), including Foodland Ontario and Buy BC.
- [Australia](https://oneill9.github.io/trmnl-in-season/#australia), including NSW Health and Brisbane City Council.
- [New Zealand](https://oneill9.github.io/trmnl-in-season/#new-zealand), including Work and Income and Horticulture New Zealand.

Use the [catalogue and transform](https://github.com/oneill9/trmnl-in-season/blob/main/src/transform.js) for the recipe's exact country, crop and month mappings. Treat those mappings as a seasonal guide, not a current local harvest report.

## Project sources

- [README](https://raw.githubusercontent.com/oneill9/trmnl-in-season/main/README.md) covers development and recipe configuration.
- [Source repository](https://github.com/oneill9/trmnl-in-season) contains the templates, evidence checks and tests. The project uses the MIT license.
- [Short reference index](https://oneill9.github.io/trmnl-in-season/llms.txt) lists the main entry points.
