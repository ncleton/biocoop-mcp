import type { Captured } from "./fake-browser.js";

export const captured: Captured = {
  "query": "tofu",
  "productUrl": "https://www.biocoop.fr/tempeh-a-cuisiner-2-200g-sy8635-000.html",
  "expected": {
    "productId": "SY8635_000",
    "name": "Tempeh à cuisiner (2) 200g",
    "price": 4.15
  },
  "searchRaw": [
    {
      "sku": "SY8635_000",
      "name": "Tempeh à cuisiner (2) 200g",
      "brand": "Soy",
      "url": "https://www.biocoop.fr/tempeh-a-cuisiner-2-200g-sy8635-000.html",
      "price": "4.15",
      "unit_price": null,
      "orderable": true,
      "bulk": false
    },
    {
      "sku": "SY9829_000",
      "name": "Tofou soyeux 400g",
      "brand": "Soy",
      "url": "https://www.biocoop.fr/tofou-soyeux-400g-sy9829-000.html",
      "price": "2.95",
      "unit_price": null,
      "orderable": true,
      "bulk": false
    },
    {
      "sku": "DN1092_000",
      "name": "Miso blanc jeune shiro 200g",
      "brand": "Danival",
      "url": "https://www.biocoop.fr/miso-blanc-jeune-shiro-200g-dn1092-000.html",
      "price": "6.25",
      "unit_price": null,
      "orderable": true,
      "bulk": false
    }
  ],
  "productRaw": {
    "sku": "SY8635_000",
    "name": "Tempeh à cuisiner (2) 200g",
    "brand": null,
    "price": "4.15",
    "unit_price": null,
    "product_number": "4458",
    "orderable": true,
    "bulk": false,
    "composition": "Soja* décortiqué précuit 99,3%, vinaigre de cidre*, ferment. Allergènes : Soja et produits à base de soja Traces de : Fabriqué dans un atelier qui utilise du gluten",
    "nutrition_text": "Valeurs nutritionnelles pour 100g/100ml Valeur énergétique (kj pour 100g/100ml) 744 kj Calories (kcal pour 100g/100ml) 179 kcal Matières grasses (g pour 100g/100ml) 9.4 g dont Acides gras saturés (g pour 100g/100ml) 1.8 g Glucides (g pour 100g/100ml) 0.5 g dont Sucres (g pour 100g/100ml) 0.4 g Protéines (g pour 100g/100ml) 19 g Sel (g pour 100g/100ml) 0.09 g Fibres alimentaires (g pour 100g/100ml) 8.1 g",
    "description": "Tempeh à cuisiner (2) 200g de la marque Soy. Classique incontournable de la cuisine Indonésienne, le Tempeh est un produit traditionnel utilisé en Orient depuis des millénaires. Fabriqué à partir de graines de soja, il est riche en protéines. Idéal en alternative à la viande."
  },
  "cartEmpty": {
    "total_text": "0,00 €",
    "items": []
  },
  "cartFilled": {
    "quantity": 2,
    "raw": {
      "total_text": "7,87 €",
      "items": [
        {
          "item_id": "40876276",
          "product_id": "4458",
          "sku": "SY8635_000",
          "name": "Tempeh à cuisiner (2) 200g",
          "qty": 2,
          "price": 4.15,
          "bulk": false
        }
      ]
    }
  }
};
