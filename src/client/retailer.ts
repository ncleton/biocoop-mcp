// Fichier généré par generate.mjs à partir de retailers/biocoop/spec.json. Ne pas modifier ici.
export interface ScopeField { key: string; env: string; description: string; example: string; pattern?: string }
export const RETAILER: {
  id: string; slug: string; version: string; label: string; origin: string; entryUrl: string; loginUrl: string; signupUrl: string;
  platform: string; fulfillment: ReadonlyArray<"delivery" | "click_and_collect">; accountRequired: boolean;
  scopeFields: ReadonlyArray<ScopeField>;
} = {
  "id": "biocoop",
  "slug": "biocoop",
  "version": "0.1.0",
  "label": "Biocoop",
  "origin": "https://www.biocoop.fr",
  "entryUrl": "https://www.biocoop.fr/magasin-biocoop_wattignies/",
  "loginUrl": "https://www.biocoop.fr/customer/account/login/",
  "signupUrl": "https://www.biocoop.fr/customer/account/create/",
  "platform": "magento",
  "fulfillment": [
    "delivery",
    "click_and_collect"
  ],
  "accountRequired": false,
  "scopeFields": [
    {
      "key": "store_url",
      "env": "BIOCOOP_STORE_URL",
      "description": "URL du magasin Biocoop choisi sur le site officiel.",
      "example": "https://www.biocoop.fr/magasin-biocoop_wattignies/",
      "pattern": "^https://www\\.biocoop\\.fr/magasin-[a-z0-9_-]+/?$"
    },
    {
      "key": "store_label",
      "env": "BIOCOOP_STORE_LABEL",
      "description": "Libellé lisible du magasin.",
      "example": "Biocoop Wattignies"
    }
  ]
};
