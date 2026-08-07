"use strict";

const PRODUCE = {
  apple: { category: "fruit", name: "Apples" },
  apricot: { category: "fruit", name: "Apricots" },
  avocado: { category: "fruit", name: "Avocados" },
  banana: { category: "fruit", name: "Bananas" },
  blackberry: { category: "fruit", name: "Blackberries" },
  blackcurrant: { category: "fruit", name: "Blackcurrants" },
  blueberry: { category: "fruit", name: "Blueberries" },
  cherry: { category: "fruit", name: "Cherries" },
  cranberry: { category: "fruit", name: "Cranberries" },
  currant: { category: "fruit", name: "Currants" },
  damson: { category: "fruit", name: "Damsons" },
  feijoa: { category: "fruit", name: "Feijoas" },
  fig: { category: "fruit", name: "Figs" },
  gooseberry: { category: "fruit", name: "Gooseberries" },
  grape: { category: "fruit", name: "Grapes" },
  grapefruit: { category: "fruit", name: "Grapefruit" },
  guava: { category: "fruit", name: "Guavas" },
  kiwifruit: { category: "fruit", name: "Kiwifruit" },
  lemon: { category: "fruit", name: "Lemons" },
  lime: { category: "fruit", name: "Limes" },
  lychee: { category: "fruit", name: "Lychees" },
  mandarin: { category: "fruit", name: "Mandarins" },
  mango: { category: "fruit", name: "Mangoes" },
  melon: { category: "fruit", name: "Melons" },
  nectarine: { category: "fruit", name: "Nectarines" },
  orange: { category: "fruit", name: "Oranges" },
  passionfruit: { category: "fruit", name: "Passionfruit" },
  peach: { category: "fruit", name: "Peaches" },
  pear: { category: "fruit", name: "Pears" },
  persimmon: { category: "fruit", name: "Persimmons" },
  pineapple: { category: "fruit", name: "Pineapples" },
  plum: { category: "fruit", name: "Plums" },
  pomegranate: { category: "fruit", name: "Pomegranates" },
  raspberry: { category: "fruit", name: "Raspberries" },
  strawberry: { category: "fruit", name: "Strawberries" },
  tamarillo: { category: "fruit", name: "Tamarillos" },
  watermelon: { category: "fruit", name: "Watermelons" },
  artichoke: { category: "vegetable", name: "Artichokes" },
  asparagus: { category: "vegetable", name: "Asparagus" },
  aubergine: {
    category: "vegetable",
    name: "Aubergines",
    names: {
      united_states: "Eggplants",
      canada: "Eggplants",
      australia: "Eggplants",
      new_zealand: "Eggplants",
    },
  },
  beetroot: {
    category: "vegetable",
    name: "Beetroot",
    names: { united_states: "Beets", canada: "Beets" },
  },
  broad_bean: {
    category: "vegetable",
    name: "Broad beans",
    names: { united_states: "Fava beans" },
  },
  broccoli: { category: "vegetable", name: "Broccoli" },
  brussels_sprout: { category: "vegetable", name: "Brussels sprouts" },
  cabbage: { category: "vegetable", name: "Cabbage" },
  capsicum: {
    category: "vegetable",
    name: "Peppers",
    names: { australia: "Capsicums", new_zealand: "Capsicums" },
  },
  carrot: { category: "vegetable", name: "Carrots" },
  cauliflower: { category: "vegetable", name: "Cauliflower" },
  celeriac: { category: "vegetable", name: "Celeriac" },
  celery: { category: "vegetable", name: "Celery" },
  chard: {
    category: "vegetable",
    name: "Chard",
    names: { australia: "Silverbeet", new_zealand: "Silverbeet" },
  },
  corn: {
    category: "vegetable",
    name: "Sweetcorn",
    names: { united_states: "Corn", canada: "Corn" },
  },
  courgette: {
    category: "vegetable",
    name: "Courgettes",
    names: {
      united_states: "Zucchini",
      canada: "Zucchini",
      australia: "Zucchini",
    },
  },
  cucumber: { category: "vegetable", name: "Cucumbers" },
  fennel: { category: "vegetable", name: "Fennel" },
  french_bean: {
    category: "vegetable",
    name: "French beans",
    names: { united_states: "Green beans", canada: "Green beans" },
  },
  garlic: { category: "vegetable", name: "Garlic" },
  kale: { category: "vegetable", name: "Kale" },
  leek: { category: "vegetable", name: "Leeks" },
  lettuce: { category: "vegetable", name: "Lettuce" },
  marrow: { category: "vegetable", name: "Marrows" },
  onion: { category: "vegetable", name: "Onions" },
  pak_choi: {
    category: "vegetable",
    name: "Pak choi",
    names: { united_states: "Bok choy", canada: "Bok choy" },
  },
  parsnip: { category: "vegetable", name: "Parsnips" },
  pea: { category: "vegetable", name: "Peas" },
  potato: { category: "vegetable", name: "Potatoes" },
  pumpkin: { category: "vegetable", name: "Pumpkins" },
  radish: { category: "vegetable", name: "Radishes" },
  runner_bean: { category: "vegetable", name: "Runner beans" },
  spinach: { category: "vegetable", name: "Spinach" },
  spring_onion: {
    category: "vegetable",
    name: "Spring onions",
    names: { united_states: "Scallions", canada: "Green onions" },
  },
  squash: { category: "vegetable", name: "Squash" },
  swede: {
    category: "vegetable",
    name: "Swedes",
    names: { united_states: "Rutabagas", canada: "Rutabagas" },
  },
  sweet_potato: {
    category: "vegetable",
    name: "Sweet potatoes",
    names: { new_zealand: "Kūmara" },
  },
  tomato: { category: "vegetable", name: "Tomatoes" },
  turnip: { category: "vegetable", name: "Turnips" },
  watercress: { category: "vegetable", name: "Watercress" },
};

const CATEGORY_GROUPS = [
  {
    key: "berries",
    name: "Berries",
    category: "fruit",
    items: [
      "blackberry",
      "blackcurrant",
      "blueberry",
      "cranberry",
      "currant",
      "gooseberry",
      "raspberry",
      "strawberry",
    ],
  },
  {
    key: "stone_fruit",
    name: "Stone fruit",
    category: "fruit",
    items: ["apricot", "cherry", "damson", "nectarine", "peach", "plum"],
  },
  {
    key: "orchard_fruit",
    name: "Orchard fruit",
    category: "fruit",
    items: ["apple", "pear", "persimmon", "pomegranate"],
  },
  {
    key: "citrus",
    name: "Citrus",
    category: "fruit",
    items: ["grapefruit", "lemon", "lime", "mandarin", "orange"],
  },
  {
    key: "tropical_fruit",
    name: "Tropical fruit",
    category: "fruit",
    items: [
      "avocado",
      "banana",
      "feijoa",
      "guava",
      "kiwifruit",
      "lychee",
      "mango",
      "passionfruit",
      "pineapple",
      "tamarillo",
    ],
  },
  {
    key: "melons",
    name: "Melons",
    category: "fruit",
    items: ["melon", "watermelon"],
  },
  {
    key: "vines_and_figs",
    name: "Vines & figs",
    category: "fruit",
    items: ["fig", "grape"],
  },
  {
    key: "roots_and_tubers",
    name: "Roots & tubers",
    category: "vegetable",
    items: [
      "beetroot",
      "carrot",
      "celeriac",
      "parsnip",
      "potato",
      "radish",
      "swede",
      "sweet_potato",
      "turnip",
    ],
  },
  {
    key: "beans_and_peas",
    name: "Beans & peas",
    category: "vegetable",
    items: ["broad_bean", "french_bean", "pea", "runner_bean"],
  },
  {
    key: "brassicas",
    name: "Brassicas",
    category: "vegetable",
    items: [
      "broccoli",
      "brussels_sprout",
      "cabbage",
      "cauliflower",
      "kale",
      "pak_choi",
    ],
  },
  {
    key: "leafy_greens",
    name: "Leafy greens",
    category: "vegetable",
    items: ["chard", "lettuce", "spinach", "watercress"],
  },
  {
    key: "alliums",
    name: "Alliums",
    category: "vegetable",
    items: ["garlic", "leek", "onion", "spring_onion"],
  },
  {
    key: "squashes_and_cucumbers",
    name: "Squashes & cucumbers",
    category: "vegetable",
    items: ["courgette", "cucumber", "marrow", "pumpkin", "squash"],
  },
  {
    key: "summer_vegetables",
    name: "Summer vegetables",
    category: "vegetable",
    items: ["aubergine", "capsicum", "corn", "tomato"],
  },
  {
    key: "stems_and_flowers",
    name: "Stems & flowers",
    category: "vegetable",
    items: ["artichoke", "asparagus", "celery", "fennel"],
  },
];

const SOURCES = {
  uk_rhs: {
    title: "Royal Horticultural Society harvest calendars",
    url: "https://www.rhs.org.uk/advice/grow-your-own",
    authoritative: true,
  },
  uk_worcestershire: {
    title: "Worcestershire County Council seasonal guide",
    url: "https://www.worcestershire.gov.uk/lets-waste-less/foodsavvy/how-eat-seasonally",
    authoritative: false,
  },
  ireland_bord_bia: {
    title: "Bord Bia Best in Season calendar",
    url: "https://www.bordbia.ie/whats-in-season/",
    authoritative: true,
  },
  us_usda: {
    title: "USDA SNAP-Ed Seasonal Produce Guide",
    url: "https://snaped.fns.usda.gov/resources/nutrition-education-materials/seasonal-produce-guide",
    authoritative: true,
  },
  canada_ontario: {
    title: "Foodland Ontario availability guide",
    url: "https://www.ontario.ca/foodland/page/availability-guide",
    authoritative: false,
  },
  canada_bc: {
    title: "Buy BC seasonal chart",
    url: "https://buybc.gov.bc.ca/app/uploads/sites/386/2020/10/Seasonal-Chart.pdf",
    authoritative: false,
  },
  australia_nsw: {
    title: "Sydney Local Health District seasonal produce guide",
    url: "https://slhd.health.nsw.gov.au/yhunger/brainfood/seasonal-fruit-vegetable-guide",
    authoritative: false,
  },
  australia_brisbane: {
    title: "Brisbane City Council seasonal produce guide",
    url: "https://www.brisbane.qld.gov.au/about-council/your-brisbane/environment-and-sustainability/food-waste/buying-local-seasonal-fruit-and-vegetables",
    authoritative: false,
  },
  nz_work_income: {
    title: "New Zealand fruit and vegetable seasonal work calendar",
    url: "https://www.workandincome.govt.nz/work/find-jobs/where-to-look-for-jobs/seasonal-work-calendar.html",
    authoritative: true,
  },
  nz_horticulture: {
    title: "Horticulture New Zealand seasonability chart",
    url: "https://www.hortnz.co.nz/assets/Vegetables-co-nz/resources/SEASONABILITY-CHART-A3.pdf",
    authoritative: false,
  },
};

function seasonalItem(id, months, popularity) {
  return { id, months, popularity };
}

function makeCountry({ name, shortName, timeZone, sourceIds, items }) {
  return {
    name,
    short_name: shortName,
    time_zone: timeZone,
    items: items.map((item) => ({ ...item, sources: [...sourceIds] })),
  };
}

const UK_ITEMS = [
  seasonalItem("apple", [8, 9, 10], 1),
  seasonalItem("apricot", [7, 8], 15),
  seasonalItem("blackberry", [8, 9, 10], 6),
  seasonalItem("blackcurrant", [6, 7, 8], 12),
  seasonalItem("blueberry", [7, 8, 9], 8),
  seasonalItem("cherry", [6, 7, 8], 7),
  seasonalItem("damson", [8, 9, 10], 14),
  seasonalItem("fig", [8, 9], 16),
  seasonalItem("gooseberry", [6, 7, 8], 13),
  seasonalItem("grape", [9, 10], 17),
  seasonalItem("peach", [7, 8, 9], 11),
  seasonalItem("pear", [8, 9, 10], 4),
  seasonalItem("plum", [7, 8, 9], 5),
  seasonalItem("raspberry", [6, 7, 8, 9, 10], 3),
  seasonalItem("strawberry", [5, 6, 7, 8, 9], 2),
  seasonalItem("artichoke", [6, 7, 8, 9, 10, 11], 33),
  seasonalItem("asparagus", [4, 5, 6], 12),
  seasonalItem("aubergine", [7, 8, 9, 10], 25),
  seasonalItem("beetroot", [6, 7, 8, 9, 10], 15),
  seasonalItem("broad_bean", [5, 6, 7, 8, 9], 19),
  seasonalItem("broccoli", [6, 7, 8, 9, 10, 11], 5),
  seasonalItem("brussels_sprout", [1, 2, 9, 10, 11, 12], 11),
  seasonalItem("cabbage", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 8),
  seasonalItem("capsicum", [7, 8, 9, 10], 29),
  seasonalItem("carrot", [6, 7, 8, 9, 10, 11], 2),
  seasonalItem("cauliflower", [6, 7, 8, 9, 10, 11], 9),
  seasonalItem("celeriac", [1, 2, 9, 10, 11, 12], 24),
  seasonalItem("celery", [7, 8, 9, 10, 11], 18),
  seasonalItem("chard", [6, 7, 8, 9, 10, 11], 31),
  seasonalItem("corn", [8, 9, 10], 10),
  seasonalItem("courgette", [6, 7, 8, 9, 10], 6),
  seasonalItem("cucumber", [6, 7, 8, 9], 14),
  seasonalItem("fennel", [6, 7, 8, 9, 10], 27),
  seasonalItem("french_bean", [7, 8, 9, 10], 16),
  seasonalItem("garlic", [6, 7, 8], 23),
  seasonalItem("kale", [1, 2, 3, 9, 10, 11, 12], 13),
  seasonalItem("leek", [1, 2, 3, 9, 10, 11, 12], 7),
  seasonalItem("lettuce", [5, 6, 7, 8, 9, 10], 17),
  seasonalItem("marrow", [8, 9, 10], 35),
  seasonalItem("onion", [7, 8, 9], 4),
  seasonalItem("pak_choi", [6, 7, 8, 9, 10], 34),
  seasonalItem("parsnip", [1, 2, 3, 9, 10, 11, 12], 20),
  seasonalItem("pea", [5, 6, 7, 8], 21),
  seasonalItem("potato", [6, 7, 8, 9, 10], 1),
  seasonalItem("pumpkin", [9, 10, 11], 22),
  seasonalItem("radish", [4, 5, 6, 7, 8, 9, 10], 30),
  seasonalItem("runner_bean", [7, 8, 9, 10], 26),
  seasonalItem("spinach", [4, 5, 6, 7, 8, 9, 10], 28),
  seasonalItem("spring_onion", [4, 5, 6, 7, 8, 9], 32),
  seasonalItem("squash", [8, 9, 10, 11], 3),
  seasonalItem("swede", [1, 2, 9, 10, 11, 12], 36),
  seasonalItem("tomato", [7, 8, 9, 10], 9),
  seasonalItem("turnip", [1, 2, 6, 7, 8, 9, 10, 11, 12], 37),
  seasonalItem("watercress", [4, 5, 6, 7, 8, 9, 10], 38),
];

const IRELAND_ITEMS = [
  seasonalItem("apple", [8, 9, 10], 1),
  seasonalItem("blackberry", [8, 9, 10], 5),
  seasonalItem("blackcurrant", [7, 8], 9),
  seasonalItem("blueberry", [7, 8, 9], 8),
  seasonalItem("cherry", [7, 8], 10),
  seasonalItem("gooseberry", [6, 7, 8], 7),
  seasonalItem("pear", [8, 9, 10], 4),
  seasonalItem("plum", [7, 8, 9], 6),
  seasonalItem("raspberry", [6, 7, 8, 9], 3),
  seasonalItem("strawberry", [5, 6, 7, 8, 9], 2),
  seasonalItem("asparagus", [4, 5, 6], 13),
  seasonalItem("beetroot", [6, 7, 8, 9, 10], 14),
  seasonalItem("broad_bean", [6, 7, 8, 9], 20),
  seasonalItem("broccoli", [6, 7, 8, 9, 10, 11], 6),
  seasonalItem("brussels_sprout", [1, 2, 9, 10, 11, 12], 11),
  seasonalItem("cabbage", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 8),
  seasonalItem("carrot", [6, 7, 8, 9, 10, 11], 2),
  seasonalItem("cauliflower", [6, 7, 8, 9, 10, 11], 9),
  seasonalItem("celeriac", [1, 2, 9, 10, 11, 12], 25),
  seasonalItem("celery", [7, 8, 9, 10], 22),
  seasonalItem("chard", [6, 7, 8, 9, 10], 31),
  seasonalItem("corn", [8, 9], 18),
  seasonalItem("courgette", [6, 7, 8, 9], 12),
  seasonalItem("cucumber", [6, 7, 8, 9], 16),
  seasonalItem("fennel", [7, 8, 9, 10], 29),
  seasonalItem("french_bean", [7, 8, 9], 17),
  seasonalItem("garlic", [7, 8], 24),
  seasonalItem("kale", [1, 2, 3, 9, 10, 11, 12], 10),
  seasonalItem("leek", [1, 2, 3, 9, 10, 11, 12], 7),
  seasonalItem("lettuce", [5, 6, 7, 8, 9], 21),
  seasonalItem("onion", [7, 8, 9], 4),
  seasonalItem("parsnip", [1, 2, 3, 9, 10, 11, 12], 19),
  seasonalItem("pea", [5, 6, 7, 8], 15),
  seasonalItem("potato", [6, 7, 8, 9, 10], 1),
  seasonalItem("pumpkin", [9, 10, 11], 23),
  seasonalItem("radish", [4, 5, 6, 7, 8, 9, 10], 28),
  seasonalItem("runner_bean", [7, 8, 9], 26),
  seasonalItem("spinach", [4, 5, 6, 7, 8, 9, 10], 27),
  seasonalItem("spring_onion", [4, 5, 6, 7, 8, 9], 30),
  seasonalItem("squash", [8, 9, 10, 11], 3),
  seasonalItem("swede", [1, 2, 9, 10, 11, 12], 32),
  seasonalItem("tomato", [7, 8, 9], 5),
  seasonalItem("turnip", [1, 2, 6, 7, 8, 9, 10, 11, 12], 33),
  seasonalItem("watercress", [4, 5, 6, 7, 8, 9, 10], 34),
];

const UNITED_STATES_ITEMS = [
  seasonalItem("apple", [8, 9, 10, 11], 1),
  seasonalItem("apricot", [5, 6, 7], 20),
  seasonalItem("avocado", [2, 3, 4, 5, 6, 7, 8, 9], 10),
  seasonalItem("blackberry", [5, 6, 7, 8], 11),
  seasonalItem("blueberry", [4, 5, 6, 7, 8, 9], 8),
  seasonalItem("cherry", [5, 6, 7, 8], 7),
  seasonalItem("cranberry", [9, 10, 11], 19),
  seasonalItem("fig", [6, 7, 8, 9, 10], 21),
  seasonalItem("grape", [7, 8, 9, 10], 12),
  seasonalItem("grapefruit", [1, 2, 3, 4, 5, 11, 12], 17),
  seasonalItem("kiwifruit", [1, 2, 3, 4, 5, 10, 11, 12], 24),
  seasonalItem("lemon", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 16),
  seasonalItem("mandarin", [1, 2, 3, 4, 11, 12], 15),
  seasonalItem("melon", [5, 6, 7, 8, 9], 14),
  seasonalItem("nectarine", [5, 6, 7, 8, 9], 13),
  seasonalItem("orange", [1, 2, 3, 4, 5, 11, 12], 6),
  seasonalItem("peach", [5, 6, 7, 8, 9], 4),
  seasonalItem("pear", [1, 2, 8, 9, 10, 11, 12], 9),
  seasonalItem("persimmon", [9, 10, 11, 12], 22),
  seasonalItem("plum", [5, 6, 7, 8, 9], 18),
  seasonalItem("pomegranate", [9, 10, 11, 12], 23),
  seasonalItem("raspberry", [5, 6, 7, 8, 9, 10], 5),
  seasonalItem("strawberry", [3, 4, 5, 6, 7, 8], 2),
  seasonalItem("watermelon", [5, 6, 7, 8, 9], 3),
  seasonalItem("artichoke", [3, 4, 5, 9, 10, 11], 32),
  seasonalItem("asparagus", [3, 4, 5, 6], 12),
  seasonalItem("aubergine", [6, 7, 8, 9, 10], 20),
  seasonalItem("beetroot", [6, 7, 8, 9, 10, 11], 18),
  seasonalItem("broad_bean", [4, 5, 6, 7], 31),
  seasonalItem("broccoli", [4, 5, 6, 9, 10, 11], 6),
  seasonalItem("brussels_sprout", [1, 2, 9, 10, 11, 12], 14),
  seasonalItem("cabbage", [1, 2, 3, 4, 5, 9, 10, 11, 12], 11),
  seasonalItem("capsicum", [6, 7, 8, 9, 10], 9),
  seasonalItem("carrot", [5, 6, 7, 8, 9, 10, 11], 2),
  seasonalItem("cauliflower", [4, 5, 9, 10, 11], 13),
  seasonalItem("celery", [6, 7, 8, 9, 10, 11], 25),
  seasonalItem("chard", [4, 5, 6, 7, 8, 9, 10, 11], 30),
  seasonalItem("corn", [6, 7, 8, 9], 1),
  seasonalItem("courgette", [6, 7, 8, 9, 10], 8),
  seasonalItem("cucumber", [5, 6, 7, 8, 9], 10),
  seasonalItem("fennel", [9, 10, 11, 12], 34),
  seasonalItem("french_bean", [6, 7, 8, 9, 10], 7),
  seasonalItem("garlic", [6, 7, 8], 23),
  seasonalItem("kale", [1, 2, 3, 4, 9, 10, 11, 12], 15),
  seasonalItem("leek", [8, 9, 10, 11, 12], 27),
  seasonalItem("lettuce", [4, 5, 6, 7, 8, 9, 10], 16),
  seasonalItem("onion", [6, 7, 8, 9, 10], 4),
  seasonalItem("parsnip", [1, 2, 9, 10, 11, 12], 28),
  seasonalItem("pea", [4, 5, 6, 7], 17),
  seasonalItem("potato", [6, 7, 8, 9, 10], 3),
  seasonalItem("pumpkin", [9, 10, 11], 19),
  seasonalItem("radish", [3, 4, 5, 6, 9, 10, 11], 29),
  seasonalItem("spinach", [3, 4, 5, 6, 9, 10, 11], 24),
  seasonalItem("spring_onion", [4, 5, 6, 7, 8, 9], 26),
  seasonalItem("squash", [6, 7, 8, 9, 10, 11], 5),
  seasonalItem("sweet_potato", [8, 9, 10, 11], 21),
  seasonalItem("tomato", [5, 6, 7, 8, 9, 10], 5),
  seasonalItem("turnip", [4, 5, 9, 10, 11], 33),
];

const CANADA_ITEMS = [
  seasonalItem("apple", [8, 9, 10], 1),
  seasonalItem("apricot", [7, 8], 13),
  seasonalItem("blackberry", [7, 8, 9], 11),
  seasonalItem("blueberry", [7, 8, 9], 6),
  seasonalItem("cherry", [6, 7, 8], 5),
  seasonalItem("cranberry", [9, 10], 12),
  seasonalItem("currant", [7, 8], 15),
  seasonalItem("gooseberry", [7, 8], 14),
  seasonalItem("grape", [8, 9, 10], 10),
  seasonalItem("pear", [8, 9, 10], 7),
  seasonalItem("plum", [8, 9], 9),
  seasonalItem("raspberry", [7, 8, 9], 4),
  seasonalItem("strawberry", [6, 7, 8, 9], 2),
  seasonalItem("watermelon", [8, 9], 8),
  seasonalItem("asparagus", [5, 6], 13),
  seasonalItem("aubergine", [7, 8, 9], 24),
  seasonalItem("beetroot", [7, 8, 9, 10], 14),
  seasonalItem("broad_bean", [7, 8], 30),
  seasonalItem("broccoli", [6, 7, 8, 9, 10], 7),
  seasonalItem("brussels_sprout", [9, 10, 11], 16),
  seasonalItem("cabbage", [6, 7, 8, 9, 10, 11], 10),
  seasonalItem("capsicum", [7, 8, 9, 10], 12),
  seasonalItem("carrot", [6, 7, 8, 9, 10, 11], 2),
  seasonalItem("cauliflower", [6, 7, 8, 9, 10], 11),
  seasonalItem("celery", [7, 8, 9, 10], 23),
  seasonalItem("chard", [6, 7, 8, 9, 10], 28),
  seasonalItem("corn", [7, 8, 9], 4),
  seasonalItem("courgette", [7, 8, 9], 9),
  seasonalItem("cucumber", [7, 8, 9], 15),
  seasonalItem("fennel", [8, 9, 10], 29),
  seasonalItem("french_bean", [7, 8, 9], 17),
  seasonalItem("garlic", [7, 8, 9], 22),
  seasonalItem("kale", [6, 7, 8, 9, 10, 11], 18),
  seasonalItem("leek", [8, 9, 10, 11], 21),
  seasonalItem("lettuce", [6, 7, 8, 9, 10], 19),
  seasonalItem("onion", [7, 8, 9, 10], 5),
  seasonalItem("parsnip", [9, 10, 11], 26),
  seasonalItem("pea", [6, 7, 8], 20),
  seasonalItem("potato", [7, 8, 9, 10], 1),
  seasonalItem("pumpkin", [9, 10, 11], 25),
  seasonalItem("radish", [5, 6, 7, 8, 9, 10], 27),
  seasonalItem("spinach", [5, 6, 7, 8, 9, 10], 31),
  seasonalItem("spring_onion", [5, 6, 7, 8, 9], 32),
  seasonalItem("squash", [7, 8, 9, 10, 11], 6),
  seasonalItem("swede", [9, 10, 11], 33),
  seasonalItem("sweet_potato", [9, 10], 34),
  seasonalItem("tomato", [7, 8, 9, 10], 3),
  seasonalItem("turnip", [6, 7, 8, 9, 10, 11], 35),
];

const AUSTRALIA_ITEMS = [
  seasonalItem("apple", [2, 3, 4, 5], 1),
  seasonalItem("apricot", [1, 11, 12], 22),
  seasonalItem("avocado", [3, 4, 5, 6, 7, 8, 9, 10, 11], 5),
  seasonalItem("banana", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 3),
  seasonalItem("blackberry", [1, 2, 3, 12], 17),
  seasonalItem("blueberry", [1, 2, 9, 10, 11, 12], 11),
  seasonalItem("cherry", [1, 11, 12], 8),
  seasonalItem("fig", [2, 3, 4, 5], 20),
  seasonalItem("grape", [1, 2, 3, 4, 5], 7),
  seasonalItem("grapefruit", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 19),
  seasonalItem("kiwifruit", [3, 4, 5, 6, 7, 8], 14),
  seasonalItem("lemon", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 9),
  seasonalItem("lime", [1, 2, 3, 4], 16),
  seasonalItem("lychee", [1, 2, 11, 12], 25),
  seasonalItem("mandarin", [4, 5, 6, 7, 8, 9, 10], 12),
  seasonalItem("mango", [1, 2, 3, 11, 12], 2),
  seasonalItem("melon", [1, 2, 3, 4, 10, 11, 12], 13),
  seasonalItem("nectarine", [1, 2, 3, 11, 12], 10),
  seasonalItem("orange", [5, 6, 7, 8, 9, 10, 11], 4),
  seasonalItem("passionfruit", [1, 2, 3, 4, 5, 6, 7], 18),
  seasonalItem("peach", [1, 2, 3, 11, 12], 6),
  seasonalItem("pear", [2, 3, 4, 5, 6], 15),
  seasonalItem("persimmon", [2, 3, 4, 5], 24),
  seasonalItem("pineapple", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 21),
  seasonalItem("plum", [1, 2, 3, 11, 12], 23),
  seasonalItem("pomegranate", [2, 3, 4, 5], 26),
  seasonalItem("raspberry", [1, 2, 3, 12], 27),
  seasonalItem("strawberry", [1, 2, 8, 9, 10, 11, 12], 6),
  seasonalItem("watermelon", [1, 2, 3, 4, 10, 11, 12], 4),
  seasonalItem("asparagus", [9, 10, 11, 12], 12),
  seasonalItem("aubergine", [1, 2, 3, 4], 16),
  seasonalItem("beetroot", [3, 4, 5, 6, 7, 8, 9, 10], 17),
  seasonalItem("broccoli", [3, 4, 5, 6, 7, 8, 9, 10], 5),
  seasonalItem("brussels_sprout", [4, 5, 6, 7, 8], 14),
  seasonalItem("cabbage", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 8),
  seasonalItem("capsicum", [1, 2, 3, 4, 10, 11, 12], 9),
  seasonalItem("carrot", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 2),
  seasonalItem("cauliflower", [3, 4, 5, 6, 7, 8, 9, 10], 10),
  seasonalItem("celery", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 18),
  seasonalItem("chard", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 23),
  seasonalItem("corn", [1, 2, 3, 4, 11, 12], 4),
  seasonalItem("courgette", [1, 2, 3, 4, 10, 11, 12], 7),
  seasonalItem("cucumber", [1, 2, 3, 4, 10, 11, 12], 11),
  seasonalItem("fennel", [3, 4, 5, 6, 7, 8, 9, 10], 22),
  seasonalItem("french_bean", [1, 2, 3, 4, 10, 11, 12], 13),
  seasonalItem("garlic", [11, 12], 25),
  seasonalItem("kale", [3, 4, 5, 6, 7, 8, 9], 15),
  seasonalItem("leek", [3, 4, 5, 6, 7, 8, 9, 10], 19),
  seasonalItem("lettuce", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 20),
  seasonalItem("onion", [1, 2, 3, 4], 3),
  seasonalItem("parsnip", [4, 5, 6, 7, 8], 24),
  seasonalItem("pea", [8, 9, 10, 11, 12], 21),
  seasonalItem("potato", [1, 2, 3, 4, 10, 11, 12], 1),
  seasonalItem("pumpkin", [2, 3, 4, 5, 6], 6),
  seasonalItem("radish", [3, 4, 5, 6, 7, 8, 9, 10, 11], 28),
  seasonalItem("spinach", [3, 4, 5, 6, 7, 8, 9, 10], 29),
  seasonalItem("spring_onion", [1, 2, 3, 4, 9, 10, 11, 12], 30),
  seasonalItem("squash", [1, 2, 3, 4, 10, 11, 12], 6),
  seasonalItem("sweet_potato", [3, 4, 5, 6, 7, 8], 21),
  seasonalItem("tomato", [1, 2, 3, 4, 10, 11, 12], 3),
];

const NEW_ZEALAND_ITEMS = [
  seasonalItem("apple", [2, 3, 4, 5], 1),
  seasonalItem("apricot", [1, 2, 12], 18),
  seasonalItem("avocado", [1, 2, 3, 4, 8, 9, 10, 11, 12], 7),
  seasonalItem("blackberry", [1, 2, 3], 16),
  seasonalItem("blueberry", [1, 2, 3, 12], 9),
  seasonalItem("cherry", [1, 2, 12], 6),
  seasonalItem("feijoa", [3, 4, 5, 6], 8),
  seasonalItem("fig", [2, 3, 4], 20),
  seasonalItem("grape", [2, 3, 4], 13),
  seasonalItem("grapefruit", [6, 7, 8, 9, 10, 11], 21),
  seasonalItem("kiwifruit", [3, 4, 5, 6], 2),
  seasonalItem("lemon", [6, 7, 8, 9, 10, 11], 12),
  seasonalItem("mandarin", [4, 5, 6, 7, 8, 9, 10], 11),
  seasonalItem("nectarine", [1, 2, 3, 12], 10),
  seasonalItem("orange", [6, 7, 8, 9, 10, 11], 5),
  seasonalItem("passionfruit", [2, 3, 4, 5, 6, 7], 15),
  seasonalItem("peach", [1, 2, 3, 12], 4),
  seasonalItem("pear", [2, 3, 4, 5], 14),
  seasonalItem("persimmon", [4, 5, 6], 19),
  seasonalItem("plum", [1, 2, 3, 12], 17),
  seasonalItem("raspberry", [1, 2, 3, 12], 3),
  seasonalItem("strawberry", [1, 2, 3, 4, 10, 11, 12], 3),
  seasonalItem("tamarillo", [5, 6, 7, 8, 9, 10], 22),
  seasonalItem("artichoke", [8, 9, 10, 11], 29),
  seasonalItem("asparagus", [9, 10, 11, 12], 12),
  seasonalItem("aubergine", [1, 2, 3, 4], 20),
  seasonalItem("beetroot", [1, 2, 3, 4, 5, 11, 12], 17),
  seasonalItem("broad_bean", [1, 10, 11, 12], 25),
  seasonalItem("broccoli", [5, 6, 7, 8, 9, 10, 11], 5),
  seasonalItem("brussels_sprout", [5, 6, 7, 8, 9], 13),
  seasonalItem("cabbage", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 8),
  seasonalItem("capsicum", [1, 2, 3, 4], 11),
  seasonalItem("carrot", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 2),
  seasonalItem("cauliflower", [5, 6, 7, 8, 9, 10, 11], 10),
  seasonalItem("celery", [4, 5, 6, 7, 8, 9, 10], 18),
  seasonalItem("chard", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 23),
  seasonalItem("corn", [1, 2, 3, 12], 4),
  seasonalItem("courgette", [1, 2, 3, 4, 12], 7),
  seasonalItem("cucumber", [1, 2, 3, 4, 12], 15),
  seasonalItem("fennel", [4, 5, 6, 7, 8, 9, 10, 11], 27),
  seasonalItem("french_bean", [1, 2, 3, 4, 12], 16),
  seasonalItem("garlic", [1, 2, 12], 24),
  seasonalItem("kale", [5, 6, 7, 8, 9, 10], 14),
  seasonalItem("leek", [4, 5, 6, 7, 8, 9, 10], 19),
  seasonalItem("lettuce", [1, 2, 3, 4, 5, 10, 11, 12], 21),
  seasonalItem("onion", [1, 2, 3, 4], 3),
  seasonalItem("parsnip", [5, 6, 7, 8, 9], 22),
  seasonalItem("pea", [1, 9, 10, 11, 12], 20),
  seasonalItem("potato", [1, 2, 3, 4, 10, 11, 12], 1),
  seasonalItem("pumpkin", [2, 3, 4, 5, 6], 6),
  seasonalItem("radish", [1, 2, 3, 4, 5, 9, 10, 11, 12], 26),
  seasonalItem("spinach", [4, 5, 6, 7, 8, 9, 10, 11], 28),
  seasonalItem("spring_onion", [1, 2, 3, 4, 5, 9, 10, 11, 12], 30),
  seasonalItem("squash", [1, 2, 3, 4, 12], 6),
  seasonalItem("sweet_potato", [2, 3, 4, 5, 6], 9),
  seasonalItem("tomato", [1, 2, 3, 4, 12], 3),
  seasonalItem("turnip", [5, 6, 7, 8, 9, 10], 31),
];

const COUNTRIES = {
  united_kingdom: makeCountry({
    name: "United Kingdom",
    shortName: "UK",
    timeZone: "Europe/London",
    sourceIds: ["uk_rhs", "uk_worcestershire"],
    items: UK_ITEMS,
  }),
  ireland: makeCountry({
    name: "Ireland",
    shortName: "Ireland",
    timeZone: "Europe/Dublin",
    sourceIds: ["ireland_bord_bia"],
    items: IRELAND_ITEMS,
  }),
  united_states: makeCountry({
    name: "United States",
    shortName: "US",
    timeZone: "America/New_York",
    sourceIds: ["us_usda"],
    items: UNITED_STATES_ITEMS,
  }),
  canada: makeCountry({
    name: "Canada",
    shortName: "Canada",
    timeZone: "America/Toronto",
    sourceIds: ["canada_ontario", "canada_bc"],
    items: CANADA_ITEMS,
  }),
  australia: makeCountry({
    name: "Australia",
    shortName: "Australia",
    timeZone: "Australia/Sydney",
    sourceIds: ["australia_nsw", "australia_brisbane"],
    items: AUSTRALIA_ITEMS,
  }),
  new_zealand: makeCountry({
    name: "New Zealand",
    shortName: "New Zealand",
    timeZone: "Pacific/Auckland",
    sourceIds: ["nz_work_income", "nz_horticulture"],
    items: NEW_ZEALAND_ITEMS,
  }),
};

const FULL_SCREEN_LIMITS = { fruit: 8, vegetable: 12 };

const CATEGORY_LIMITS = {
  half_horizontal: { fruit: 3, vegetable: 4 },
  half_vertical: { fruit: 3, vegetable: 4 },
  quadrant: { fruit: 2, vegetable: 2 },
};

const COUNTRY_ALIASES = {
  uk: "united_kingdom",
  gb: "united_kingdom",
  great_britain: "united_kingdom",
  us: "united_states",
  usa: "united_states",
  united_states_of_america: "united_states",
  nz: "new_zealand",
};

function parameterize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeCountryCode(value) {
  const parameterizedValue = parameterize(value);
  return COUNTRY_ALIASES[parameterizedValue] || parameterizedValue;
}

function selectedCountryCode(input) {
  const fieldValues = input?.trmnl?.plugin_settings?.custom_fields_values;
  const rawValue =
    fieldValues?.country ||
    input?.trmnl?.plugin_settings?.country ||
    input?.country ||
    input?.data?.country;

  return normalizeCountryCode(rawValue);
}

function selectedTimeZone(input, country) {
  return (
    input?.trmnl?.user?.time_zone_iana ||
    input?.trmnl?.user?.time_zone ||
    country?.time_zone ||
    "UTC"
  );
}

function dateParts(date, timeZone) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      month: "long",
      timeZone,
    });
    const monthName = formatter.format(date);
    const month = Number(
      new Intl.DateTimeFormat("en-US", {
        month: "numeric",
        timeZone,
      }).format(date)
    );

    return { month, monthName, timeZone };
  } catch (_error) {
    return dateParts(date, "UTC");
  }
}

function displayName(produceId, countryCode) {
  const produce = PRODUCE[produceId];
  return produce.names?.[countryCode] || produce.name;
}

function compareByName(first, second) {
  return first.name.localeCompare(second.name, "en", { sensitivity: "base" });
}

function compareByPopularity(first, second) {
  return first.popularity - second.popularity || compareByName(first, second);
}

function presentItem(item, countryCode) {
  const produce = PRODUCE[item.id];
  return {
    id: item.id,
    name: displayName(item.id, countryCode),
    category: produce.category,
    popularity: item.popularity,
  };
}

function compactCategory(items, limit) {
  const visibleItems = [...items].sort(compareByPopularity).slice(0, limit);
  return {
    items: visibleItems,
    more_count: Math.max(0, items.length - visibleItems.length),
  };
}

function summarizeCategories(items, limit) {
  const categories = CATEGORY_GROUPS.map((group, index) => {
    const groupItems = items
      .filter((item) => group.items.includes(item.id))
      .sort(compareByPopularity);

    if (groupItems.length === 0) {
      return null;
    }

    return {
      key: group.key,
      name: group.name,
      item_count: groupItems.length,
      examples: groupItems.slice(0, 2),
      priority: groupItems[0].popularity,
      group_order: index,
    };
  })
    .filter(Boolean)
    .sort(
      (first, second) =>
        second.item_count - first.item_count ||
        first.priority - second.priority ||
        first.group_order - second.group_order
    );
  const visibleCategories = categories.slice(0, limit).map((category) => {
    const { group_order: _groupOrder, priority: _priority, ...visible } =
      category;
    return visible;
  });

  return {
    categories: visibleCategories,
    more_count: Math.max(0, categories.length - visibleCategories.length),
  };
}

function buildCompactCategories(fruits, vegetables) {
  return Object.fromEntries(
    Object.entries(CATEGORY_LIMITS).map(([layout, limits]) => [
      layout,
      {
        fruits: summarizeCategories(fruits, limits.fruit),
        vegetables: summarizeCategories(vegetables, limits.vegetable),
      },
    ])
  );
}

function buildFullScreenShortlist(fruits, vegetables) {
  return {
    fruits: compactCategory(fruits, FULL_SCREEN_LIMITS.fruit),
    vegetables: compactCategory(vegetables, FULL_SCREEN_LIMITS.vegetable),
  };
}

function emptyPayload({ now, countryCode = null, errorMessage }) {
  const currentDate = now();
  const { month, monthName } = dateParts(currentDate, "UTC");
  return {
    has_data: false,
    has_items: false,
    country_code: countryCode,
    country_name: null,
    country_short_name: null,
    guide_label: "National harvest guide",
    month,
    month_name: monthName,
    updated_at: currentDate.toISOString(),
    fruit_count: 0,
    vegetable_count: 0,
    total_count: 0,
    fruits: [],
    vegetables: [],
    shortlist: buildFullScreenShortlist([], []),
    compact: buildCompactCategories([], []),
    error_message: errorMessage,
  };
}

function transformSeasonality(input, now = () => new Date()) {
  const countryCode = selectedCountryCode(input);
  const country = COUNTRIES[countryCode];

  if (!country) {
    const errorMessage = countryCode
      ? "That country is not supported."
      : "Choose a supported country.";
    return emptyPayload({ now, countryCode: countryCode || null, errorMessage });
  }

  const currentDate = now();
  const { month, monthName, timeZone } = dateParts(
    currentDate,
    selectedTimeZone(input, country)
  );
  const currentItems = country.items
    .filter((item) => item.months.includes(month))
    .map((item) => presentItem(item, countryCode));
  const fruits = currentItems
    .filter((item) => item.category === "fruit")
    .sort(compareByName);
  const vegetables = currentItems
    .filter((item) => item.category === "vegetable")
    .sort(compareByName);

  return {
    has_data: true,
    has_items: currentItems.length > 0,
    country_code: countryCode,
    country_name: country.name,
    country_short_name: country.short_name,
    guide_label: "National harvest guide",
    month,
    month_name: monthName,
    time_zone: timeZone,
    updated_at: currentDate.toISOString(),
    fruit_count: fruits.length,
    vegetable_count: vegetables.length,
    total_count: currentItems.length,
    fruits,
    vegetables,
    shortlist: buildFullScreenShortlist(fruits, vegetables),
    compact: buildCompactCategories(fruits, vegetables),
    error_message: null,
  };
}

function run(input, dependencies = {}) {
  return transformSeasonality(input, dependencies.now || (() => new Date()));
}

if (typeof module !== "undefined") {
  module.exports = {
    CATEGORY_GROUPS,
    CATEGORY_LIMITS,
    COUNTRIES,
    FULL_SCREEN_LIMITS,
    PRODUCE,
    SOURCES,
    buildCompactCategories,
    buildFullScreenShortlist,
    dateParts,
    displayName,
    normalizeCountryCode,
    run,
    selectedCountryCode,
    transformSeasonality,
  };
}
