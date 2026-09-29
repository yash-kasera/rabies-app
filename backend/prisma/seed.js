require("dotenv/config");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Safe to re-run: only missing cities / content sections are added.

// Service area. Add entries here to roll out to more cities.
const CITIES = [
  { name: "Jabalpur", state: "Madhya Pradesh", latitude: 23.1667, longitude: 79.95 },
];

const CONTENT_SECTIONS = [
  { sectionKey: "what_is_rabies", title: "What is Rabies?", body: "Rabies is a fatal viral disease transmitted through the bite, scratch, or saliva of an infected animal. It affects the central nervous system and is almost always fatal once symptoms appear.", order: 1 },
  { sectionKey: "how_it_spreads", title: "How does it spread?", body: "Rabies spreads through bites, scratches, or saliva contact with broken skin or mucous membranes. The main sources are dogs (especially in India), but cats, monkeys, bats, and other mammals can also transmit it.", order: 2 },
  { sectionKey: "symptoms", title: "Symptoms", body: "Early symptoms: fever, headache, tingling at the bite site.\nLate symptoms: confusion, hydrophobia (fear of water), paralysis.\n\nOnce symptoms appear, rabies is almost always fatal. This is why acting immediately after a bite matters.", order: 3 },
  { sectionKey: "why_timing_matters", title: "Why timing matters", body: "Rabies has an incubation period of weeks to months. Treatment (vaccine + immunoglobulin) works only if started BEFORE symptoms begin. Once symptoms show, the disease is nearly 100% fatal.", order: 4 },
  { sectionKey: "myths_vs_facts", title: "Myths vs Facts", body: "Myth: Only mad/foaming dogs carry rabies.\nFact: A calm-looking animal can also be infected.\n\nMyth: Rabies can be cured if treated early enough.\nFact: Rabies is preventable (via vaccine), not curable. Once symptoms appear, it is almost always fatal.\n\nMyth: Traditional remedies like applying chili powder help.\nFact: These worsen the wound and increase infection risk. Wash with soap and water.", order: 5 },
  { sectionKey: "precautions_first_aid", title: "Immediate First Aid", body: "1. Wash the wound immediately with soap and running water for at least 15 minutes.\n2. Apply an antiseptic (e.g. povidone-iodine) if available.\n3. Do NOT cover the wound tightly or apply home remedies.\n4. Do NOT try to suck out any 'venom' - rabies is a virus, not venom.\n5. Go to the nearest hospital/clinic immediately for post-exposure vaccine.", order: 6 },
  { sectionKey: "dos", title: "Do's", body: "- Note the animal's appearance/behavior if safely possible.\n- Keep the wound clean and loosely covered.\n- Complete the full vaccine dose schedule even if you feel fine.", order: 7 },
  { sectionKey: "donts", title: "Don'ts", body: "- Don't ignore a minor-looking scratch - even small wounds can transmit rabies.\n- Don't wait to see if the animal seems sick before seeking care.\n- Don't stop the vaccine course early.", order: 8 },
  { sectionKey: "faq_1", title: "FAQ: Can I get rabies from a scratch?", body: "Yes, if the scratch is from an infected animal and breaks the skin, or if saliva gets into the wound.", order: 9 },
  { sectionKey: "faq_2", title: "FAQ: Is rabies curable?", body: "Rabies is preventable with timely vaccination, but not curable once symptoms develop. This is why immediate treatment after a bite is critical.", order: 10 },
  { sectionKey: "faq_3", title: "FAQ: How many vaccine doses are needed?", body: "The standard post-exposure prophylaxis (PEP) schedule involves 5 doses on Days 0, 3, 7, 14, and 28.", order: 11 },
];

async function main() {
  let citiesAdded = 0;
  for (const city of CITIES) {
    const existing = await prisma.city.findFirst({
      where: { name: { equals: city.name, mode: "insensitive" } },
    });
    if (!existing) {
      await prisma.city.create({ data: city });
      citiesAdded++;
    }
  }

  let sectionsAdded = 0;
  for (const section of CONTENT_SECTIONS) {
    const existing = await prisma.contentSection.findUnique({ where: { sectionKey: section.sectionKey } });
    if (!existing) {
      await prisma.contentSection.create({ data: section });
      sectionsAdded++;
    }
  }

  console.log(`Seed complete: added ${citiesAdded} cities and ${sectionsAdded} content sections.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
