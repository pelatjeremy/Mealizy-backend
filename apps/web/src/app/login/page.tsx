"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getApiErrorMessage, login, storeAuthToken } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    try {
      const auth = await login({ email, password });
      storeAuthToken(auth.token);
      router.push("/dashboard");
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, "Connexion impossible."));
      setStatus("error");
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Connexion</h1>
        <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="sophie@mail.com" /></label>
        <label>Mot de passe<input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="8 caracteres minimum" /></label>
        <button className="primary-action" type="submit" disabled={status === "loading"}>Se connecter</button>
        {status === "error" && <p className="form-note danger">{errorMessage || "Connexion impossible."}</p>}
        <Link href="/register">Creer un compte</Link>
      </form>
    </main>
  );
}
