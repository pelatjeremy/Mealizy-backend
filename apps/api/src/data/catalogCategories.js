export const ingredientCategories = [
  {
    id: "fruits-legumes",
    label: "Fruits et legumes",
    aliases: ["fruits", "legumes", "fruits & legumes"],
    subcategories: [
      { id: "fruits", label: "Fruits" },
      { id: "legumes", label: "Legumes" },
      { id: "champignons", label: "Champignons" },
      { id: "aromates-frais", label: "Aromates frais" }
    ]
  },
  {
    id: "viandes-poissons",
    label: "Viandes et poissons",
    aliases: ["viandes", "poissons", "fruits de mer"],
    subcategories: [
      { id: "viandes", label: "Viandes" },
      { id: "volaille", label: "Volaille" },
      { id: "poissons", label: "Poissons" },
      { id: "fruits-de-mer", label: "Fruits de mer" },
      { id: "charcuterie", label: "Charcuterie" }
    ]
  },
  {
    id: "produits-laitiers",
    label: "Produits laitiers",
    aliases: ["laitages", "cremerie"],
    subcategories: [
      { id: "lait", label: "Lait" },
      { id: "fromages", label: "Fromages" },
      { id: "yaourts", label: "Yaourts" },
      { id: "cremes", label: "Cremes" },
      { id: "beurres", label: "Beurres" }
    ]
  },
  {
    id: "epicerie",
    label: "Epicerie",
    aliases: ["placard"],
    subcategories: [
      { id: "feculents", label: "Feculents" },
      { id: "cereales", label: "Cereales" },
      { id: "legumineuses", label: "Legumineuses" },
      { id: "conserves", label: "Conserves" },
      { id: "huiles", label: "Huiles" }
    ]
  },
  {
    id: "boissons",
    label: "Boissons",
    aliases: [],
    subcategories: [
      { id: "eaux", label: "Eaux" },
      { id: "jus", label: "Jus" },
      { id: "boissons-chaudes", label: "Boissons chaudes" },
      { id: "alcools", label: "Alcools" }
    ]
  },
  {
    id: "surgeles",
    label: "Surgeles",
    aliases: ["congeles"],
    subcategories: [
      { id: "legumes-surgeles", label: "Legumes surgeles" },
      { id: "poissons-surgeles", label: "Poissons surgeles" },
      { id: "plats-surgeles", label: "Plats surgeles" }
    ]
  },
  {
    id: "condiments",
    label: "Condiments",
    aliases: ["sauces"],
    subcategories: [
      { id: "sauces", label: "Sauces" },
      { id: "vinaigres", label: "Vinaigres" },
      { id: "moutardes", label: "Moutardes" }
    ]
  },
  {
    id: "herbes-epices",
    label: "Herbes et epices",
    aliases: ["epices", "herbes"],
    subcategories: [
      { id: "epices", label: "Epices" },
      { id: "herbes-seches", label: "Herbes seches" },
      { id: "sels-poivres", label: "Sels et poivres" }
    ]
  },
  {
    id: "boulangerie",
    label: "Boulangerie",
    aliases: ["pain"],
    subcategories: [
      { id: "pains", label: "Pains" },
      { id: "viennoiseries", label: "Viennoiseries" },
      { id: "pates", label: "Pates a tarte" }
    ]
  },
  {
    id: "desserts",
    label: "Desserts",
    aliases: ["sucre"],
    subcategories: [
      { id: "patisserie", label: "Patisserie" },
      { id: "chocolats", label: "Chocolats" },
      { id: "glaces", label: "Glaces" }
    ]
  },
  {
    id: "autres",
    label: "Autres",
    aliases: [],
    subcategories: []
  }
];

export const ingredientCategoryIds = ingredientCategories.map((category) => category.id);

