/* eslint-disable */
// Bulk-create club members in Supabase Auth (which populates `profiles` via the
// existing trigger that reads first_name / last_name from user_metadata).
//
// Usage:
//   1. Make sure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
//   2. From the repo root: `node scripts/add-users.js`
//
// Optional env overrides:
//   STANDARD_PASSWORD   (default: "TcGruenfels2026!")
//   EMAIL_DOMAIN        (default: "tcgruenfels.ch")
//   DRY_RUN=1           lists what would happen without writing anything

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STANDARD_PASSWORD = process.env.STANDARD_PASSWORD || "TcGruenfels2026!";
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || "tcgruenfels.ch";
const DRY_RUN = process.env.DRY_RUN === "1";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment."
  );
  process.exit(1);
}

// Note: "Dani+ela Reichlin" in the source list was a typo and is recorded as
// "Daniela Reichlin" here.
const USERS = [
  { first_name: "Mauro", last_name: "Baumann" },
  { first_name: "Rico", last_name: "Bernardi" },
  { first_name: "Daniele", last_name: "Bernardi" },
  { first_name: "David", last_name: "Berther" },
  { first_name: "Markus", last_name: "Brändli" },
  { first_name: "Peter", last_name: "Breitegger" },
  { first_name: "Philipp", last_name: "Engler" },
  { first_name: "Skedda", last_name: "Fred" },
  { first_name: "Willi", last_name: "Gehrig" },
  { first_name: "Tc", last_name: "GF" },
  { first_name: "Urs", last_name: "Gimmi" },
  { first_name: "Philipp", last_name: "Hangartner" },
  { first_name: "Bruno", last_name: "Huber" },
  { first_name: "Roman", last_name: "Janser" },
  { first_name: "Walter", last_name: "Kälin" },
  { first_name: "Pascal", last_name: "Kuster" },
  { first_name: "Beat", last_name: "Loosli" },
  { first_name: "Esther", last_name: "Mächler" },
  { first_name: "Kim", last_name: "Marbach" },
  { first_name: "Martin", last_name: "Meier" },
  { first_name: "Erich", last_name: "Meier" },
  { first_name: "Jenny", last_name: "Odermatt" },
  { first_name: "Christoph", last_name: "Reichlin" },
  { first_name: "Daniela", last_name: "Reichlin" },
  { first_name: "Jonas", last_name: "Reinhard" },
  { first_name: "Sebastian", last_name: "Reiser" },
  { first_name: "Simon", last_name: "Rüdisüli" },
  { first_name: "Ernst", last_name: "Rüthemann" },
  { first_name: "Pascal", last_name: "Schmitz" },
  { first_name: "Manu", last_name: "Senn" },
  { first_name: "Andrea", last_name: "Serra" },
  { first_name: "Philipp", last_name: "Suarez" },
  { first_name: "Manuel", last_name: "Suarez" },
  { first_name: "Simon", last_name: "Umher" },
  { first_name: "Christian", last_name: "Untersander" },
  { first_name: "Dennis", last_name: "Von Ballmoos" },
  { first_name: "Jens", last_name: "Von Ballmoos" },
  { first_name: "Reto", last_name: "Wickli" },
  { first_name: "Matthias", last_name: "Wickli" },
  { first_name: "Marc", last_name: "Willhaus" },
  { first_name: "Kevin", last_name: "Wüthrich" },
  { first_name: "Andreas", last_name: "Wymann" },
  { first_name: "Oliver", last_name: "Züger" },
  { first_name: "Alfons", last_name: "Zuppiger" },
  { first_name: "Jürg", last_name: "Zwingli" },
  { first_name: "Christof", last_name: "Zwyssig" },
];

function normalize(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "");
}

function emailFor(u) {
  return `${normalize(u.first_name)}.${normalize(u.last_name)}@${EMAIL_DOMAIN}`;
}

function nameKey(u) {
  return `${normalize(u.first_name)}|${normalize(u.last_name)}`;
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  console.log("Fetching existing profiles…");
  const { data: existing, error: fetchErr } = await supabase
    .from("profiles")
    .select("first_name, last_name");
  if (fetchErr) {
    console.error("Failed to fetch existing profiles:", fetchErr.message);
    process.exit(1);
  }
  const existingKeys = new Set(existing.map(nameKey));
  console.log(`Found ${existing.length} existing profile(s).`);
  if (DRY_RUN) console.log("DRY_RUN=1 — no changes will be written.");

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of USERS) {
    const label = `${user.first_name} ${user.last_name}`;
    if (existingKeys.has(nameKey(user))) {
      console.log(`SKIP  (profile exists)   ${label}`);
      skipped++;
      continue;
    }

    const email = emailFor(user);

    if (DRY_RUN) {
      console.log(`WOULD CREATE             ${label} <${email}>`);
      created++;
      continue;
    }

    const { error } = await supabase.auth.admin.createUser({
      email,
      password: STANDARD_PASSWORD,
      email_confirm: true,
      user_metadata: {
        first_name: user.first_name,
        last_name: user.last_name,
        must_change_password: true,
      },
    });

    if (error) {
      if (/already (been )?registered|already exists|duplicate/i.test(error.message)) {
        console.log(`SKIP  (auth user exists) ${label} <${email}>`);
        skipped++;
      } else {
        console.error(`FAIL  ${label} <${email}>: ${error.message}`);
        failed++;
      }
      continue;
    }

    console.log(`OK    ${label} <${email}>`);
    created++;
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}, Failed: ${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
