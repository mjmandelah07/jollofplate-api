# JollofPlate — ChatGPT Image Prompts (Categories)

Use these prompts in **ChatGPT (DALL·E)** or similar image tools to generate **category cover images** for the menu.

## Global style (paste once, then add a category prompt)

```text
Brand: JollofPlate — premium Nigerian jollof food brand.
Tagline mood: "Every Plate Tells a Story."
Visual style: appetizing food photography, modern, warm, premium, clean, high detail, natural lighting, shallow depth of field.
Color mood: jollof red (#C0392B), golden rice (#F39C12), fresh green accents (#145A32), warm cream background (#FFF8F0).
Composition: centered hero dish, uncluttered, mobile-friendly square or 4:5 crop, no text, no logos, no watermarks, no hands unless needed.
Quality: ultra realistic, restaurant menu photography, 4K look.
```

---

## 1. Signature Jollof

**Use for:** classic party jollof, smoky jollof, coconut jollof

```text
Create a premium food photo for the menu category "Signature Jollof".
Show a generous bowl or plate of vibrant Nigerian party jollof rice — rich orange-red grains, slightly smoky look, glossy tomato stew coating, steam rising.
Optional small garnish of fried plantain or grilled chicken on the side, but rice is the hero.
Warm cream surface, soft natural light, appetizing and premium.
No text, no logo, no watermark.
```

**Variations (optional):**
- Smoky: emphasize darker edges / smoky aroma feel, charcoal-kissed look.
- Coconut: slightly lighter golden rice, coconut flakes garnish, tropical warmth.

---

## 2. Plates & Combos

**Use for:** jollof + protein packs (chicken, beef, fish, goat)

```text
Create a premium food photo for the menu category "Plates & Combos".
Show a full Nigerian combo plate: mound of jollof rice with grilled chicken, peppered beef, and a piece of fried fish arranged neatly.
Include a small side of plantain or coleslaw.
Looks like a complete meal deal, abundant but clean plating.
Warm cream background, restaurant photography, appetizing, no text, no logo.
```

---

## 3. Proteins

**Use for:** grilled chicken, peppered beef, turkey, fish, assorted

```text
Create a premium food photo for the menu category "Proteins".
Show an appealing platter of Nigerian proteins: grilled chicken, peppered beef, turkey, and fried/grilled fish.
Glossy pepper sauce, visible spice, char marks, fresh garnish.
No rice as the main focus — proteins are the hero.
Warm lighting, clean plating, appetizing, no text, no logo.
```

---

## 4. Sides

**Use for:** plantain, coleslaw, moi moi, salad, fries

```text
Create a premium food photo for the menu category "Sides".
Show a neat assortment of Nigerian and everyday sides: golden fried plantain, creamy coleslaw, wrapped moi moi, fresh salad, and crispy fries.
Small bowls arranged attractively on a warm cream surface.
Bright, fresh, colorful, appetizing, no text, no logo.
```

---

## 5. Soups & Swallows

**Use for:** egusi, okra, efo, pounded yam, eba

```text
Create a premium food photo for the menu category "Soups & Swallows".
Show a rich bowl of Nigerian soup (egusi or efo riro) with soft pounded yam or eba on the side.
Include visible vegetables, protein pieces in the soup, and a smooth swallow portion.
Authentic, comforting, premium home-style plating, warm lighting.
No text, no logo, no watermark.
```

---

## 6. Drinks

**Use for:** zobo, Chapman, soft drinks, water

```text
Create a premium food photo for the menu category "Drinks".
Show refreshing Nigerian drinks: deep red zobo in a clear glass with hibiscus/fruit garnish, a colorful Chapman cocktail look, plus a soft drink and a bottle of water.
Condensation on glasses, ice, bright and refreshing vibe.
Warm cream surface, clean composition, no text, no logo.
```

---

## 7. Desserts / Small chops

**Use for:** puff puff, spring rolls, meat pie (optional)

```text
Create a premium food photo for the menu category "Desserts / Small chops".
Show a party platter of Nigerian small chops: golden puff puff, crispy spring rolls, and flaky meat pies.
Warm, inviting, slightly festive, great for sharing.
Soft lighting, appetizing close-up, no text, no logo.
```

---

## 8. Groceries

**Use for:** everyday grocery packs, pantry staples, market-style bundles

```text
Create a premium product photo for the menu category "Groceries".
Show a neat grocery arrangement on a warm cream surface: bags of rice, cooking oil, tomato paste cans, seasoning cubes, onions, peppers, and fresh tomatoes.
Looks like a curated Nigerian kitchen starter pack — abundant but tidy, modern market aesthetic.
Soft natural light, clean composition, appetizing and premium.
No text, no logo, no watermark, no price tags.
```

**Variations (optional):**
- Family pack: larger bags of rice and oil, bulk feel.
- Fresh market: more produce (peppers, tomatoes, onions, scent leaf) less packaged goods.

---

## 9. Food Stuff

**Use for:** dry foodstuff, spices, grains, soup ingredients, cooking staples

```text
Create a premium product photo for the menu category "Food Stuff".
Show Nigerian dry foodstuff and cooking staples arranged attractively: bags or bowls of egusi, ground crayfish, dried pepper, beans, garri, ofada rice, and spice blends.
Warm earthy tones with jollof-red and golden accents, rustic-premium feel on a warm cream surface.
Looks fresh from a well-stocked African grocery shelf, clean and inviting.
No text, no logo, no watermark, no packaging brand labels.
```

**Variations (optional):**
- Soup base kit: egusi, stockfish pieces, dried fish, pepper, crayfish.
- Swallow staples: garri, yam flour, plantain flour in neat bowls/bags.

---

## 10. Frozen Food

**Use for:** frozen proteins, frozen veggies, ready-to-cook frozen packs

```text
Create a premium product photo for the menu category "Frozen Food".
Show frozen Nigerian food items looking cold and fresh: vacuum-sealed or tray-packed chicken, fish, turkey, and maybe frozen spinach or mixed veggies.
Subtle frost / cold condensation, clean white-and-cream cool tones with warm brand accents, modern freezer-aisle premium look.
Food is the hero — appetizing even while frozen, tidy arrangement.
No text, no logo, no watermark, no brand packaging labels.
```

**Variations (optional):**
- Protein freezer pack: chicken, turkey, fish fillets only.
- Ready-cook: frozen jollof/meal packs + protein in clear trays (still no logos).

---

## Tips for better results

1. Generate **square (1:1)** or **4:5** images for category cards.
2. Ask: “Remove all text and logos” if any appear.
3. Ask for **3 variations**, then pick the best.
4. After generating, upload via `POST /admin/uploads`, then set the category `image` URL.
5. Keep style consistent: same lighting and cream background across all **10** images.
6. For Groceries / Food Stuff / Frozen Food, explicitly say **no brand labels or barcodes** so the image stays usable as a category cover.

## Short “batch” prompt (all categories)

```text
Using the JollofPlate brand style (warm, premium Nigerian food photography, jollof red and golden tones, warm cream background, no text/logos), generate one hero image for each menu category:
1) Signature Jollof
2) Plates & Combos
3) Proteins
4) Sides
5) Soups & Swallows
6) Drinks
7) Desserts / Small chops
8) Groceries
9) Food Stuff
10) Frozen Food
Make them visually consistent as a set for a modern food ordering app. For groceries, food stuff, and frozen food: no brand labels or barcodes.
```

---

## Related

- Logo prompts (website, socials, PNG/SVG): [`LOGO_PROMPTS.md`](./LOGO_PROMPTS.md)
