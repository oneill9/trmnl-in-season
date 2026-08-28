# Data sources and methodology

## Product definition

A fruit or vegetable counts as "in season" when growers normally harvest it in the selected country during that calendar month. Shop availability alone does not qualify it.

The catalogue excludes:

- Imports
- Produce available only from long-term storage
- Produce available only from heated greenhouses or other protected methods
- Mushrooms, herbs, nuts, grains, dried pulses, and rhubarb

The catalogue follows culinary categories, so tomatoes, peppers, cucumbers, aubergines or eggplants, and squash appear under Vegetables.

## Geographic rule

Country is the only required setting. Some supported countries span several climate zones. For those countries, the catalogue uses the overlap between common harvest periods in the main producing regions. It does not include a crop simply because growers harvest it somewhere in the country.

The result is an approximate national guide. Weather, latitude, altitude, cultivar, and farming method can move harvest dates by several weeks.

## Evidence policy

Use government sources, national horticultural bodies, and national produce boards where possible. One detailed authoritative source may support an item. Otherwise, require at least two reputable agricultural or public-sector sources.

Source calendars use different levels of precision. Round their ranges to whole calendar months. When credible sources disagree, use the shorter overlap. Remove periods marked "stored," "frozen," "dried," or "greenhouse" when a source separates them from fresh field harvests.

Every country entry in `src/transform.js` lists the sources used to compile it. Automated tests reject missing source identifiers and unsupported claims that rely on one source.

## Sources

Maintainers reviewed all sources on 5 August 2026.

### United Kingdom

- [Royal Horticultural Society, Grow Your Own](https://www.rhs.org.uk/advice/grow-your-own), including its fruit gardening calendar, vegetable crop planner, and harvesting guidance
- [Worcestershire County Council, How to eat seasonally](https://www.worcestershire.gov.uk/lets-waste-less/foodsavvy/how-eat-seasonally)

### Ireland

- [Bord Bia, Best in Season calendar](https://www.bordbia.ie/whats-in-season/)

### United States

- [USDA SNAP-Ed, Seasonal Produce Guide](https://snaped.fns.usda.gov/resources/nutrition-education-materials/seasonal-produce-guide)

### Canada

- [Foodland Ontario, Availability guide](https://www.ontario.ca/foodland/page/availability-guide)
- [Buy BC, Seasonal chart](https://buybc.gov.bc.ca/app/uploads/sites/386/2020/10/Seasonal-Chart.pdf)

When provincial calendars differ, the catalogue keeps only their overlapping fresh-harvest periods. It excludes storage and greenhouse periods identified by the sources.

### Australia

- [Sydney Local Health District, Seasonal Fruit and Vegetable Guide](https://slhd.health.nsw.gov.au/yhunger/brainfood/seasonal-fruit-vegetable-guide)
- [Brisbane City Council, Buying local, seasonal fruit and vegetables](https://www.brisbane.qld.gov.au/about-council/your-brisbane/environment-and-sustainability/food-waste/buying-local-seasonal-fruit-and-vegetables)

The catalogue keeps seasons shared by the temperate and subtropical guides. Availability in one state does not count as nationwide availability.

### New Zealand

- [Work and Income New Zealand, Fruit and vegetable seasonal work calendar](https://www.workandincome.govt.nz/work/find-jobs/where-to-look-for-jobs/seasonal-work-calendar.html)
- [Horticulture New Zealand, New Zealand-grown vegetable seasonability chart](https://www.hortnz.co.nz/assets/Vegetables-co-nz/resources/SEASONABILITY-CHART-A3.pdf)

## Updating the catalogue

When revising season windows:

1. Review the current source and record any replacement source.
2. Change the smallest relevant country entry in `src/transform.js`.
3. Preserve canonical IDs and country-local display names unless the underlying item changes.
4. Run `npm test` to validate month ranges, evidence identifiers, catalogue sizes, terminology, and compact ranking.
5. Render every layout with `trmnlp build --png` and inspect both a dense month and the missing-country state.
