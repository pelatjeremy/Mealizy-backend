import { PageScaffold } from "@/components/ui/PageScaffold";

const mealTypes = ["Petit-déjeuner", "Déjeuner", "Dîner", "Collation"];
const equipments = ["Four", "Micro-ondes", "Plaques", "Robot", "Air fryer", "Blender"];

export default function ProfilePage() {
  return (
    <PageScaffold title="Profil" description="Ajustez les préférences qui pilotent les suggestions et les quantités.">
      <section className="panel form-panel">
        <label>Nombre de personnes<input defaultValue="2" type="number" /></label>
        <div>
          <h2>Repas pris en compte</h2>
          <div className="toggle-grid">{mealTypes.map((item) => <label key={item}><input defaultChecked type="checkbox" /> {item}</label>)}</div>
        </div>
        <div>
          <h2>Équipements disponibles</h2>
          <div className="toggle-grid">{equipments.map((item) => <label key={item}><input defaultChecked={item !== "Air fryer"} type="checkbox" /> {item}</label>)}</div>
        </div>
      </section>
    </PageScaffold>
  );
}
