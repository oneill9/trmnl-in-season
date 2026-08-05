# Data Sources and Methodology

## Product definition

“In season” means a common fruit or vegetable is normally harvested domestically during the selected calendar month. It does not mean that the item is merely available in shops.

The catalogue therefore excludes:

- Imports
- Produce available only from long-term storage
- Produce available only from heated greenhouses or other protected growing
- Mushrooms, herbs, nuts, grains, dried pulses, and rhubarb

Tomatoes, peppers, cucumbers, aubergines/eggplants, and squash use their culinary category and appear under Vegetables.

## Geographic rule

Country is the only required setting. For countries with several climate zones, the catalogue uses a conservative national window based on mainstream domestic harvests across major producing regions. It does not use the broad union of every crop grown somewhere in the country.

The guide is intentionally approximate. Weather, latitude, altitude, cultivar, and farming method can move actual harvest dates by several weeks.

## Evidence policy

Government, national horticultural bodies, and national produce boards are preferred. A sufficiently detailed authoritative source may stand alone. Otherwise, an item must be corroborated by at least two reputable agricultural or public-sector sources.

Source calendars express seasons with different precision. Their ranges are normalized to whole calendar months. When credible sources disagree, the shorter overlap is preferred. “Stored,” “frozen,” “dried,” and “greenhouse” periods are removed where a source distinguishes them from fresh field harvests.

Every country entry in `src/transform.js` carries the identifiers of the sources used to compile it. Automated tests reject missing source identifiers and any unsupported single-source evidence.

## Sources

All sources were reviewed on 5 August 2026.

### United Kingdom

- [Royal Horticultural Society — Grow Your Own](https://www.rhs.org.uk/advice/grow-your-own), including its fruit gardening calendar, vegetable crop planner, and harvesting guidance
- [Worcestershire County Council — How to eat seasonally](https://www.worcestershire.gov.uk/lets-waste-less/foodsavvy/how-eat-seasonally)

### Ireland

- [Bord Bia — Best in Season calendar](https://www.bordbia.ie/whats-in-season/)

### United States

- [USDA SNAP-Ed — Seasonal Produce Guide](https://snaped.fns.usda.gov/resources/nutrition-education-materials/seasonal-produce-guide)

### Canada

- [Foodland Ontario — Availability guide](https://www.ontario.ca/foodland/page/availability-guide)
- [Buy BC — Seasonal chart](https://buybc.gov.bc.ca/app/uploads/sites/386/2020/10/Seasonal-Chart.pdf)

Only overlapping fresh-harvest periods are retained when provincial calendars differ. Storage and greenhouse periods identified by these sources are excluded.

### Australia

- [Sydney Local Health District — Seasonal Fruit and Vegetable Guide](https://slhd.health.nsw.gov.au/yhunger/brainfood/seasonal-fruit-vegetable-guide)
- [Brisbane City Council — Buying local, seasonal fruit and vegetables](https://www.brisbane.qld.gov.au/about-council/your-brisbane/environment-and-sustainability/food-waste/buying-local-seasonal-fruit-and-vegetables)

The catalogue favors seasons shared by the temperate and subtropical guides rather than treating availability in any single state as nationwide.

### New Zealand

- [Work and Income New Zealand — Fruit and vegetable seasonal work calendar](https://www.workandincome.govt.nz/work/find-jobs/where-to-look-for-jobs/seasonal-work-calendar.html)
- [Horticulture New Zealand — New Zealand-grown vegetable seasonability chart](https://www.hortnz.co.nz/assets/Vegetables-co-nz/resources/SEASONABILITY-CHART-A3.pdf)

## Updating the catalogue

When revising season windows:

1. Review the current source and record any replacement source.
2. Change the smallest relevant country entry in `src/transform.js`.
3. Preserve canonical IDs and country-local display names unless the underlying item changes.
4. Run `npm test` to validate month ranges, evidence identifiers, catalogue sizes, terminology, and compact ranking.
5. Render every layout with `trmnlp build --png` and inspect both a dense month and the missing-country state.

