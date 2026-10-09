import {
  ROBOT_PATTERN, decodeHtml, escapeRegExp, formatEuro, hasVeganClaim, isObject, isOrganic, parsePrice, str,
  type Adapter, type MutationInput, type SessionSignals,
} from "./adapter.js";
import type { ShopConfig } from "./config.js";
import { ContractChangedError, ShopError } from "./errors.js";
import type { CartInput, ProductInput, SummaryInput } from "./types.js";

const HOST = "www.biocoop.fr";

function storePath(config: ShopConfig): string {
  return new URL(config.scope.store_url).pathname.replace(/\/+$/, "");
}

const PRELUDE = String.raw`
const clean = (value) => String(value == null ? "" : value).replace(/\s+/g, " ").trim();
const formKey = () => { const match = document.cookie.match(/form_key=([^;]+)/); return match ? match[1] : null; };
const stripped = (node) => { const copy = node.cloneNode(true); copy.querySelectorAll("style, script").forEach((x) => x.remove()); return clean(copy.textContent); };
const readCart = async () => {
  const response = await fetch(BASE + "/customer/section/load/?sections=cart&force_new_section_timestamp=true", { credentials: "include", headers: { "X-Requested-With": "XMLHttpRequest" } });
  if (!response.ok) throw new Error("Panier HTTP " + response.status);
  const json = await response.json();
  const cart = json && json.cart;
  if (!cart || !Array.isArray(cart.items)) throw new Error("Contrat customer-data cart absent");
  return {
    total_text: clean(String(cart.subtotal_incl_tax || cart.subtotal || "").replace(/<[^>]+>/g, " ")),
    items: cart.items.map((item) => ({ item_id: item.item_id, product_id: item.product_id, sku: item.product_sku, name: item.product_name, qty: item.qty, price: item.product_price_value, bulk: !!item.is_vrac })),
  };
};
const post = async (path, params) => {
  const key = formKey();
  if (!key) throw new Error("Contrat form_key absent");
  const body = new URLSearchParams(Object.assign({ form_key: key }, params));
  const response = await fetch(location.origin + BASE + path, { method: "POST", credentials: "include", headers: { "X-Requested-With": "XMLHttpRequest", "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", Accept: "application/json, text/javascript, */*; q=0.01" }, body: body });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.success === false) throw new Error("Panier refusé (" + response.status + ") : " + clean(json.message || json.error || "").slice(0, 200));
  return json;
};
`;

function searchExpression(base: string, query: string): string {
  return String.raw`(async () => {
    const BASE = ${JSON.stringify(base)};
    ${PRELUDE}
    const response = await fetch(BASE + "/catalogsearch/result/?q=" + encodeURIComponent(${JSON.stringify(query)}), { credentials: "include" });
    if (!response.ok) throw new Error("Recherche HTTP " + response.status);
    const doc = new DOMParser().parseFromString(await response.text(), "text/html");
    const items = Array.prototype.slice.call(doc.querySelectorAll("li.product-item"));
    if (!items.length) {
      if (!/aucun r[ée]sultat|aucun produit|ne correspond|0 r[ée]sultat/i.test(clean(doc.body && doc.body.textContent).slice(0, 8000))) throw new Error("Contrat liste produits absent");
      return [];
    }
    return items.filter((item) => item.querySelector("a.product-item-link[data-id]")).map((item) => {
      const anchor = item.querySelector("a.product-item-link[data-id]");
      const form = item.querySelector("form[action*='checkout/cart/add']");
      const amount = item.querySelector("[data-price-amount]");
      const unit = item.querySelector(".price-per-unit, .unit-price, .price-unit, [class*='prix-kg'], [class*='price-by']");
      return {
        sku: anchor ? anchor.getAttribute("data-id") : null,
        name: anchor ? clean(anchor.getAttribute("data-name")) : null,
        brand: anchor ? clean(anchor.getAttribute("data-brand")) || null : null,
        url: anchor ? anchor.href : null,
        price: amount ? amount.getAttribute("data-price-amount") : (anchor ? anchor.getAttribute("data-price") : null),
        unit_price: unit ? clean(unit.textContent) : null,
        orderable: !!form,
        bulk: /product-item-vrac/.test(item.className),
      };
    });
  })()`;
}

function productExpression(base: string, productUrl: string): string {
  return String.raw`(async () => {
    const BASE = ${JSON.stringify(base)};
    ${PRELUDE}
    const target = new URL(${JSON.stringify(productUrl)});
    const path = target.pathname.indexOf(BASE + "/") === 0 ? target.pathname.slice(BASE.length) : target.pathname;
    const response = await fetch(BASE + path, { credentials: "include" });
    if (!response.ok) throw new Error("Fiche HTTP " + response.status);
    const doc = new DOMParser().parseFromString(await response.text(), "text/html");
    const form = doc.querySelector("form[action*='checkout/cart/add']");
    const field = (name) => { const input = form && form.querySelector("input[name='" + name + "']"); return input ? input.value : null; };
    const meta = (selector) => { const node = doc.querySelector(selector); return node ? (node.getAttribute("content") || clean(node.textContent)) : null; };
    const composition = doc.querySelector("#composition-product");
    const nutrition = doc.querySelector(".tab_nutritionnelle, [class*='tab_nutrition']");
    const unit = doc.querySelector(".price-per-unit, .unit-price, .price-unit, [class*='prix-kg'], [class*='price-by']");
    const amount = doc.querySelector("[data-price-amount]");
    return {
      sku: meta("[itemprop='sku']"),
      name: clean((doc.querySelector("h1") || {}).textContent) || meta("meta[property='og:title']"),
      brand: meta("meta[property='product:brand']") || null,
      price: amount ? amount.getAttribute("data-price-amount") : meta("meta[property='product:price:amount']"),
      unit_price: unit ? clean(unit.textContent) : null,
      product_number: field("product"),
      orderable: !!form,
      bulk: (() => { const main = doc.querySelector("form[data-role^='updateqty-form']"); return !!main && main.getAttribute("data-vrac") === "1"; })(),
      composition: composition ? clean(composition.textContent).replace(/^composition\s*/i, "") : null,
      nutrition_text: nutrition ? clean(nutrition.textContent) : null,
      description: meta("meta[name='description']"),
    };
  })()`;
}

function cartExpression(base: string): string {
  return String.raw`(async () => { const BASE = ${JSON.stringify(base)}; ${PRELUDE} return readCart(); })()`;
}

function mutationExpression(base: string, input: MutationInput): string {
  return String.raw`(async () => {
    const BASE = ${JSON.stringify(base)};
    ${PRELUDE}
    const sku = ${JSON.stringify(input.productId)};
    const target = ${input.targetQuantity};
    const before = await readCart();
    const line = before.items.find((item) => String(item.sku) === sku);
    const current = line ? Number(line.qty) : 0;
    if (current === target) return { before, after: before, applied: false };
    if (target === 0) {
      await post("/checkout/sidebar/removeItem/", { item_id: String(line.item_id) });
    } else if (line) {
      await post("/checkout/sidebar/updateItemQty/", { item_id: String(line.item_id), item_qty: String(target) });
    } else {
      const pageUrl = ${JSON.stringify(input.productUrl)};
      if (!pageUrl) throw new Error("URL produit requise pour un premier ajout");
      const url = new URL(pageUrl);
      const path = url.pathname.indexOf(BASE + "/") === 0 ? url.pathname.slice(BASE.length) : url.pathname;
      const page = await fetch(BASE + path, { credentials: "include" });
      if (!page.ok) throw new Error("Fiche HTTP " + page.status);
      const doc = new DOMParser().parseFromString(await page.text(), "text/html");
      const form = doc.querySelector("form[action*='checkout/cart/add']");
      const numeric = form && form.querySelector("input[name='product']");
      const pageSku = doc.querySelector("[itemprop='sku']");
      if (!numeric) throw new Error("Produit non commandable dans ce magasin");
      const main = doc.querySelector("form[data-role^='updateqty-form']");
      if (main && main.getAttribute("data-vrac") === "1") throw new Error("Produit vendu au poids : choisissez le poids sur le site officiel");
      if (pageSku && clean(pageSku.getAttribute("content") || pageSku.textContent) !== sku) throw new Error("La fiche ne correspond pas au produit demandé");
      await post("/checkout/cart/add/product/" + numeric.value + "/", { product: numeric.value, qty: String(target), fromPage: "Product_list" });
    }
    return { before, after: await readCart(), applied: true };
  })()`;
}

export const adapter: Adapter = {
  entryUrl: (config) => config.scope.store_url,
  matchesTab: (url) => url.protocol === "https:" && url.hostname === HOST,
  validateScope(scope) {
    const url = new URL(scope.store_url);
    if (url.protocol !== "https:" || url.hostname !== HOST || !/^\/magasin-[a-z0-9_-]+\/?$/.test(url.pathname)) {
      throw new ShopError("BIOCOOP_STORE_URL ne désigne pas un magasin Biocoop officiel.", "invalid_configuration", "Utilisez l’URL du magasin choisie sur biocoop.fr, de la forme https://www.biocoop.fr/magasin-ville/.");
    }
  },
  scopeLabel: (config) => config.scope.store_label,
  inspectSession({ snapshot, tabUrl, config }): SessionSignals {
    let onStore = false;
    try {
      const url = new URL(tabUrl);
      onStore = url.hostname === HOST && url.pathname.startsWith(`${storePath(config)}/`);
    } catch { onStore = false; }
    const labelVisible = new RegExp(escapeRegExp(config.scope.store_label), "i").test(snapshot);
    const robotVisible = ROBOT_PATTERN.test(snapshot);
    return { ready: (onStore || labelVisible) && !robotVisible && snapshot.trim().length > 0, robotVisible, accountConnected: /d[ée]connexion|se d[ée]connecter/i.test(snapshot) };
  },
  validateProductUrl(url) {
    if (url.protocol !== "https:" || url.hostname !== HOST || !url.pathname.endsWith(".html")) throw new Error("Hors des fiches produit Biocoop.");
  },
  searchExpression: (config, query) => searchExpression(storePath(config), query),
  normalizeSearch(raw, config): SummaryInput[] {
    if (!Array.isArray(raw)) throw new ContractChangedError("La recherche n’a pas retourné une liste de produits.");
    return raw.map((entry): SummaryInput => {
      if (!isObject(entry)) throw new ContractChangedError("Un produit n’est plus un objet exploitable.");
      const sku = str(entry, "sku");
      const name = str(entry, "name");
      const price = parsePrice(entry.price);
      const url = str(entry, "url");
      if (!sku || !name || price === null || !url || typeof entry.orderable !== "boolean") throw new ContractChangedError("Un produit ne contient plus son SKU, son nom, son prix, son URL ou son état commandable.");
      void config;
      return {
        product_id: sku, name: decodeHtml(name), brand: str(entry, "brand"), price, unit_price: str(entry, "unit_price"),
        availability: entry.orderable ? "available" : "out_of_stock", available_quantity: null, organic: isOrganic(name), product_url: url,
      };
    });
  },
  productExpression: (config, productUrl) => productExpression(storePath(config), productUrl),
  normalizeProduct(raw, _config, requestedUrl): ProductInput {
    if (!isObject(raw)) throw new ContractChangedError("La fiche n’a pas retourné l’objet produit attendu.");
    const sku = str(raw, "sku");
    const name = str(raw, "name");
    const price = parsePrice(raw.price);
    if (!sku || !name || price === null || typeof raw.orderable !== "boolean") throw new ContractChangedError("La fiche ne contient plus son SKU, son nom, son prix ou son état commandable.");
    const text = `${name} ${str(raw, "description") ?? ""}`;
    return {
      product_id: sku, name: decodeHtml(name), brand: str(raw, "brand"), price, unit_price: str(raw, "unit_price"),
      availability: raw.orderable ? "available" : "out_of_stock", available_quantity: null, organic: isOrganic(text), product_url: requestedUrl,
      ean: null, ingredients: str(raw, "composition"), vegan_claim: hasVeganClaim(text), nutrition: [],
    };
  },
  cartExpression: (config) => cartExpression(storePath(config)),
  normalizeCart(raw): CartInput {
    if (!isObject(raw) || !Array.isArray(raw.items)) throw new ContractChangedError("Le panier n’a plus la forme observée.");
    const items = raw.items.map((entry) => {
      if (!isObject(entry)) throw new ContractChangedError("Une ligne de panier n’est plus exploitable.");
      const sku = str(entry, "sku");
      const quantity = Number(entry.qty);
      if (!sku || !Number.isInteger(quantity) || quantity < 0) throw new ContractChangedError("Une ligne de panier ne contient plus son SKU ou sa quantité entière (produit au poids ?).");
      const unit = parsePrice(entry.price);
      return { product_id: sku, name: str(entry, "name"), quantity, available_quantity: null, unit_price: unit, line_total: unit === null ? null : Math.round(unit * quantity * 100) / 100 };
    });
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const total = parsePrice(str(raw, "total_text"));
    return { empty: totalQuantity === 0, total_quantity: totalQuantity, total_price: total === null ? "0,00 €" : formatEuro(total), items };
  },
  mutationExpression: (config, input) => {
    return mutationExpression(storePath(config), input);
  },
};
