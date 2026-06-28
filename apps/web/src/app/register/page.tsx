"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiErrorMessage, register, storeAuthToken } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    try {
      const auth = await register({ firstname, lastname, email, password });
      storeAuthToken(auth.token);
      router.push("/dashboard");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Inscription impossible."));
      setStatus("error");
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Inscription</h1>
        <label>Prenom<input value={firstname} onChange={(event) => setFirstname(event.target.value)} placeholder="Sophie" /></label>
        <label>Nom<input value={lastname} onChange={(event) => setLastname(event.target.value)} placeholder="Dupont" /></label>
        <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="sophie@mail.com" /></label>
        <label>Mot de passe<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="8 caracteres minimum" /></label>
        <button className="primary-action" type="submit" disabled={status === "loading"}>Creer le compte</button>
        {status === "error" && <p className="form-note danger">{errorMessage || "Inscription impossible."}</p>}
        <Link href="/login">J'ai deja un compte</Link>
      </form>
    </main>
  );
}
