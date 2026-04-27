import Link from "next/link";
import ContactForm from "@/components/ContactForm";

export default function Home() {
  return (
    <div className="space-y-24 py-12">
      {/* Hero */}
      <section className="text-center pt-8">
        <img
          src="/logo.png"
          alt="TC Grünfels"
          className="h-32 w-auto mx-auto mb-8"
        />
        <h1 className="text-5xl sm:text-6xl font-serif text-[var(--stone-800)] mb-4 tracking-tight">
          TC Grünfels
        </h1>
        <p className="text-xl text-[var(--stone-500)] mb-2">
          Tennisclub seit 1962
        </p>
        <p className="text-base text-[var(--stone-400)] max-w-xl mx-auto mb-10">
          Ein Sandplatz im Grünen. Vereinsleben und Clubmeisterschaft —
          willkommen am TC Grünfels.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/login" className="btn-primary text-base">
            Mitgliederbereich
          </Link>
          <a href="#kontakt" className="btn-secondary text-base">
            Kontakt
          </a>
        </div>
      </section>

      {/* Info cards */}
      <section className="grid md:grid-cols-3 gap-6">
        <div className="card-elevated p-6">
          <h3 className="font-serif text-xl text-[var(--stone-800)] mb-2">
            Anlage
          </h3>
          <p className="text-sm text-[var(--stone-600)] leading-relaxed">
            Ein gepflegter Sandplatz, Clubhaus mit Garderoben und Terrasse.
            Anfahrt und Plan auf Anfrage.
          </p>
        </div>
        <div className="card-elevated p-6">
          <h3 className="font-serif text-xl text-[var(--stone-800)] mb-2">
            Mitgliedschaft
          </h3>
          <ul className="text-sm text-[var(--stone-600)] leading-relaxed space-y-1 mb-3">
            <li>Einzelmitgliedschaft — CHF 430</li>
            <li>Familienmitgliedschaft — CHF 550</li>
          </ul>
          <p className="text-sm text-[var(--stone-600)] leading-relaxed">
            Beitrittsgesuch über das Kontaktformular.
          </p>
        </div>
        <div className="card-elevated p-6">
          <h3 className="font-serif text-xl text-[var(--stone-800)] mb-2">
            Spielbetrieb
          </h3>
          <p className="text-sm text-[var(--stone-600)] leading-relaxed">
            Sommer-Saison von April bis Oktober. Clubmeisterschaft jährlich
            im Hochsommer, Interclub-Mannschaften nach Saisonplan.
          </p>
        </div>
      </section>

      {/* Member area CTA */}
      <section className="card-elevated p-10 text-center">
        <h2 className="font-serif text-3xl text-[var(--stone-800)] mb-3">
          Mitgliederbereich
        </h2>
        <p className="text-[var(--stone-500)] mb-6 max-w-xl mx-auto">
          Plätze buchen, Resultate eintragen, Turnierstand verfolgen — alles
          an einem Ort.
        </p>
        <Link href="/login" className="btn-primary text-base">
          Anmelden
        </Link>
      </section>

      {/* Contact */}
      <section id="kontakt" className="grid md:grid-cols-2 gap-10">
        <div>
          <h2 className="font-serif text-3xl text-[var(--stone-800)] mb-4">
            Kontakt
          </h2>
          <p className="text-[var(--stone-600)] leading-relaxed mb-6">
            Fragen zur Mitgliedschaft, zum Spielbetrieb oder zur Anlage?
            Schreibe uns über das Formular oder direkt per E-Mail.
          </p>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-[var(--stone-400)] uppercase tracking-wide text-xs mb-1">
                E-Mail
              </dt>
              <dd className="text-[var(--stone-700)]">
                <a href="mailto:info@tcgruenfels.ch" className="hover:underline">
                  info@tcgruenfels.ch
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-[var(--stone-400)] uppercase tracking-wide text-xs mb-1">
                Standort
              </dt>
              <dd className="text-[var(--stone-700)]">
                <a
                  href="https://maps.google.com/?cid=4290480340083704613"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  TC Grünfels, Jona — auf Google Maps
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-[var(--stone-400)] uppercase tracking-wide text-xs mb-1">
                Verein
              </dt>
              <dd className="text-[var(--stone-700)]">
                Tennisclub Grünfels
              </dd>
            </div>
          </dl>
        </div>
        <ContactForm />
      </section>
    </div>
  );
}
