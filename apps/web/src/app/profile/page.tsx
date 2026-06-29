"use client";

import { useEffect, useState } from "react";
import { CircleAlert, Loader2, Save } from "lucide-react";
import { asArray, getApiErrorMessage, getProfile, readAuthToken, updateProfile } from "@/lib/api";
import { PageScaffold } from "@/components/ui/PageScaffold";
import type { MealType, UserProfile } from "@/types/domain";

const mealTypes: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Petit-dejeuner" },
  { value: "lunch", label: "Dejeuner" },
  { value: "dinner", label: "Diner" },
  { value: "snack", label: "Collation" }
];

const equipments = ["four", "micro-ondes", "plaques", "robot", "air fryer", "blender"];

type Status = "loading" | "ready" | "missing-token" | "error";
type Notice = { text: string; tone: "success" | "error" };

function toggleValue<T extends string>(values: T[], value: T, checked: boolean) {
  const safeValues = asArray<T>(values);
  return checked ? [...new Set([...safeValues, value])] : safeValues.filter((item) => item !== value);
}

export default function ProfilePage() {
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const authToken = readAuthToken();
    setToken(authToken);
    if (!authToken) {
      setStatus("missing-token");
      return;
    }

    getProfile(authToken)
      .then((loadedProfile) => {
        setProfile(loadedProfile);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  async function handleSave() {
    if (!token || !profile) return;
    setIsSaving(true);
    setNotice(null);

    try {
      const savedProfile = await updateProfile(token, {
        firstname: profile.firstname,
        lastname: profile.lastname,
        householdSize: Math.max(Number(profile.householdSize || 1), 1),
        enabledMealTypes: asArray<MealType>(profile.enabledMealTypes),
        availableEquipments: asArray<string>(profile.availableEquipments)
      });
      setProfile(savedProfile);
      setNotice({ text: "Profil mis a jour.", tone: "success" });
      window.dispatchEvent(new Event("mealizy:data-changed"));
    } catch (error) {
      setNotice({ text: getApiErrorMessage(error, "Impossible de mettre a jour le profil."), tone: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PageScaffold title="Profil" description="Ajustez les preferences qui pilotent les suggestions et les quantites.">
      {status === "loading" && <div className="state-panel"><Loader2 size={22} /> Chargement du profil</div>}
      {status === "missing-token" && <div className="state-panel"><CircleAlert size={22} /> Connectez-vous pour modifier votre profil.</div>}
      {status === "error" && <div className="state-panel"><CircleAlert size={22} /> Impossible de charger le profil.</div>}
      {notice && <div className={`state-panel notice-${notice.tone}`} role="status" aria-live="polite">{notice.text}</div>}

      {status === "ready" && profile && (
        <section className="panel form-panel">
          <label>
            Prenom
            <input value={profile.firstname || ""} onChange={(event) => setProfile({ ...profile, firstname: event.target.value })} />
          </label>
          <label>
            Nom
            <input value={profile.lastname || ""} onChange={(event) => setProfile({ ...profile, lastname: event.target.value })} />
          </label>
          <label>
            Nombre de personnes
            <input
              min="1"
              type="number"
              value={profile.householdSize || 1}
              onChange={(event) => setProfile({ ...profile, householdSize: Number(event.target.value) })}
            />
          </label>
          <div>
            <h2>Repas pris en compte</h2>
            <div className="toggle-grid">
              {mealTypes.map((item) => (
                <label key={item.value}>
                  <input
                    checked={asArray<MealType>(profile.enabledMealTypes).includes(item.value)}
                    type="checkbox"
                    onChange={(event) => setProfile({
                      ...profile,
                      enabledMealTypes: toggleValue(asArray<MealType>(profile.enabledMealTypes), item.value, event.target.checked)
                    })}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <h2>Equipements disponibles</h2>
            <div className="toggle-grid">
              {equipments.map((item) => (
                <label key={item}>
                  <input
                    checked={asArray<string>(profile.availableEquipments).includes(item)}
                    type="checkbox"
                    onChange={(event) => setProfile({
                      ...profile,
                      availableEquipments: toggleValue(asArray<string>(profile.availableEquipments), item, event.target.checked)
                    })}
                  />
                  {item}
                </label>
              ))}
            </div>
          </div>
          <button className="primary-action" type="button" disabled={isSaving} onClick={handleSave}>
            {isSaving ? <Loader2 size={17} /> : <Save size={17} />} Enregistrer
          </button>
        </section>
      )}
    </PageScaffold>
  );
}
