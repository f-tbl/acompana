import type { Contact, Person } from "@/db/schema";

export function FichaMedica({ persona, contactos }: { persona: Person; contactos: Contact[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-4xl">{persona.avatar}</span>
        <div>
          <h2 className="text-xl font-semibold">{persona.name}</h2>
          <p className="text-sm text-stone-500">
            {persona.age} años · {persona.perfil === "nino" ? "Niño/a" : "Persona dependiente"}
            {persona.bloodType && <> · Grupo {persona.bloodType}</>}
          </p>
        </div>
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <Dato titulo="Diagnósticos" valor={persona.diagnoses.join(", ") || "Ninguno"} />
        <Dato titulo="Alergias" valor={persona.allergies.join(", ") || "Ninguna conocida"} destacar={persona.allergies.length > 0} />
        <Dato titulo="Médico de cabecera" valor={persona.doctorName ? `${persona.doctorName} · ${persona.doctorPhone ?? ""}` : "—"} />
        <Dato titulo="Voluntades anticipadas" valor={persona.advanceDirectives || "No registradas"} />
      </dl>

      {persona.medications.length > 0 && (
        <div>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">Medicación actual</h3>
          <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 text-sm">
            {persona.medications.map((m) => (
              <li key={m.nombre} className="flex justify-between gap-2 px-3 py-2">
                <span className="font-medium">
                  {m.nombre} <span className="font-normal text-stone-500">{m.dosis}</span>
                </span>
                <span className="text-stone-500">{m.horario}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {persona.notes && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{persona.notes}</p>}

      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">Contactos</h3>
        <ul className="space-y-1 text-sm">
          {contactos.map((c) => (
            <li key={c.id} className="flex justify-between gap-2">
              <span>
                {c.name} <span className="text-stone-500">({c.relation} · {c.role})</span>
              </span>
              <a href={`tel:${c.phone}`} className="font-mono text-stone-700 underline">
                {c.phone}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Dato({ titulo, valor, destacar }: { titulo: string; valor: string; destacar?: boolean }) {
  return (
    <div className={destacar ? "rounded-xl bg-rose-50 p-3 text-rose-900" : "rounded-xl bg-stone-100 p-3"}>
      <dt className="text-xs font-semibold uppercase tracking-wide opacity-70">{titulo}</dt>
      <dd className="mt-0.5">{valor}</dd>
    </div>
  );
}
