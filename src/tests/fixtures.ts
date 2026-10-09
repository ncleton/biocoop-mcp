import { buildShop } from "./fake-browser.js";
import { captured } from "./data.js";

export const productUrl = captured.productUrl;
export const expected = { query: captured.query, ...captured.expected };
export const robotSnapshot = 'heading "Vérification de sécurité"\nlink "Mon compte"';

type RawCart = { total_text: string; items: Array<Record<string, unknown>> };

export function createShop() {
  const filled = captured.cartFilled.raw as RawCart;
  const line = filled.items[0];
  const unit = Number(line.price);
  return buildShop(captured, { store_url: "https://www.biocoop.fr/magasin-biocoop_wattignies/", store_label: "Biocoop Wattignies" }, (count) => {
    if (count === 0) return captured.cartEmpty;
    return { total_text: `${(unit * count).toFixed(2).replace(".", ",")} €`, items: [{ ...line, qty: count }] };
  });
}
