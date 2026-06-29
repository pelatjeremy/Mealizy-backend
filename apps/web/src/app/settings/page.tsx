import { PageScaffold } from "@/components/ui/PageScaffold";

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export default function SettingsPage() {
  return (
    <PageScaffold title="Parametres" description="Controlez la configuration visible de l'environnement beta.">
      <section className="settings-grid">
        <article className="panel config-card">
          <span>Backend API</span>
          <strong>{apiUrl}</strong>
          <p>URL publique utilisee par le frontend pour appeler Mealizy.</p>
        </article>
        <article className="panel config-card">
          <span>Recettes externes</span>
          <strong>Spoonacular ou catalogue synchronise</strong>
          <p>La cle API reste configuree cote backend et n'est jamais exposee au navigateur.</p>
        </article>
        <article className="panel config-card">
          <span>Session</span>
          <strong>Jeton utilisateur local</strong>
          <p>Mode accepte pour beta controlee. A remplacer par cookies securises avant ouverture publique.</p>
        </article>
      </section>
    </PageScaffold>
  );
}
