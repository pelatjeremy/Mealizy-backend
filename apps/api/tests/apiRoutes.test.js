import test from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/app.js";

async function withServer(assertions) {
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();

  try {
    await assertions(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("health endpoint returns a stable ok payload", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    const payload = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(payload, { status: "ok" });
  });
});

test("catalog category and unit endpoints are publicly readable", async () => {
  await withServer(async (baseUrl) => {
    const [categoriesResponse, unitsResponse] = await Promise.all([
      fetch(`${baseUrl}/api/catalog/categories`),
      fetch(`${baseUrl}/api/catalog/units`)
    ]);
    const categories = await categoriesResponse.json();
    const units = await unitsResponse.json();

    assert.equal(categoriesResponse.status, 200);
    assert.equal(unitsResponse.status, 200);
    assert.ok(categories.some((category) => category.id === "autres"));
    assert.ok(units.some((unit) => unit.id === "g"));
  });
});

test("unknown API routes return a consistent 404 JSON error", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/does-not-exist`);
    const payload = await response.json();

    assert.equal(response.status, 404);
    assert.match(payload.message, /Route not found/);
  });
});

