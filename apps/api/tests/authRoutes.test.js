import test from "node:test";
import assert from "node:assert/strict";
import { app } from "../src/app.js";
import { User } from "../src/models/User.js";
import { signToken } from "../src/services/tokenService.js";

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

function authUser(overrides = {}) {
  return {
    _id: "user-id",
    firstname: "Sophie",
    lastname: "Dupont",
    email: "sophie@mail.com",
    password: "hashed-password",
    enabledMealTypes: ["breakfast", "lunch", "dinner", "snack"],
    comparePassword: async (candidate) => candidate === "password123",
    toObject() {
      return {
        _id: this._id,
        firstname: this.firstname,
        lastname: this.lastname,
        email: this.email,
        password: this.password,
        enabledMealTypes: this.enabledMealTypes,
        ...overrides
      };
    },
    ...overrides
  };
}

function stubUserModel({ create, findOne, findById, findByIdAndUpdate } = {}) {
  const originalCreate = User.create;
  const originalFindOne = User.findOne;
  const originalFindById = User.findById;
  const originalFindByIdAndUpdate = User.findByIdAndUpdate;

  if (create) User.create = create;
  if (findOne) User.findOne = findOne;
  if (findById) User.findById = findById;
  if (findByIdAndUpdate) User.findByIdAndUpdate = findByIdAndUpdate;

  return () => {
    User.create = originalCreate;
    User.findOne = originalFindOne;
    User.findById = originalFindById;
    User.findByIdAndUpdate = originalFindByIdAndUpdate;
  };
}

async function postJson(baseUrl, path, payload) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

test("POST /api/auth/register creates a user and returns a token", async () => {
  const restore = stubUserModel({
    create: async (payload) => authUser({ ...payload, _id: "created-user-id" })
  });

  try {
    await withServer(async (baseUrl) => {
      const response = await postJson(baseUrl, "/api/auth/register", {
        firstname: " Sophie ",
        lastname: "Dupont",
        email: "SOPHIE@MAIL.COM",
        password: "password123"
      });
      const payload = await response.json();

      assert.equal(response.status, 201);
      assert.equal(payload.user.email, "sophie@mail.com");
      assert.equal(payload.user.password, undefined);
      assert.equal(typeof payload.token, "string");
      assert.ok(payload.token.length > 20);
    });
  } finally {
    restore();
  }
});

test("POST /api/auth/register rejects duplicate email with 409", async () => {
  const duplicateError = new Error("duplicate key");
  duplicateError.code = 11000;
  duplicateError.keyPattern = { email: 1 };

  const restore = stubUserModel({
    create: async () => {
      throw duplicateError;
    }
  });

  try {
    await withServer(async (baseUrl) => {
      const response = await postJson(baseUrl, "/api/auth/register", {
        firstname: "Sophie",
        lastname: "Dupont",
        email: "sophie@mail.com",
        password: "password123"
      });
      const payload = await response.json();

      assert.equal(response.status, 409);
      assert.equal(payload.message, "Un compte existe deja avec cet email");
    });
  } finally {
    restore();
  }
});

test("POST /api/auth/login returns a token for valid credentials", async () => {
  const restore = stubUserModel({
    findOne: () => ({ select: async () => authUser() })
  });

  try {
    await withServer(async (baseUrl) => {
      const response = await postJson(baseUrl, "/api/auth/login", {
        email: "SOPHIE@MAIL.COM",
        password: "password123"
      });
      const payload = await response.json();

      assert.equal(response.status, 200);
      assert.equal(payload.user.email, "sophie@mail.com");
      assert.equal(payload.user.password, undefined);
      assert.equal(typeof payload.token, "string");
    });
  } finally {
    restore();
  }
});

test("POST /api/auth/login rejects invalid password", async () => {
  const restore = stubUserModel({
    findOne: () => ({ select: async () => authUser() })
  });

  try {
    await withServer(async (baseUrl) => {
      const response = await postJson(baseUrl, "/api/auth/login", {
        email: "sophie@mail.com",
        password: "wrong-password"
      });
      const payload = await response.json();

      assert.equal(response.status, 401);
      assert.equal(payload.message, "Email ou mot de passe incorrect");
    });
  } finally {
    restore();
  }
});

test("protected profile route accepts a valid Bearer token", async () => {
  const restore = stubUserModel({
    findById: () => ({
      select: async () => authUser({ password: undefined })
    })
  });

  try {
    await withServer(async (baseUrl) => {
      const token = signToken("user-id");
      const response = await fetch(`${baseUrl}/api/users/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const payload = await response.json();

      assert.equal(response.status, 200);
      assert.equal(payload.email, "sophie@mail.com");
      assert.equal(payload.password, undefined);
    });
  } finally {
    restore();
  }
});

test("protected profile route rejects missing token", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/users/profile`);
    const payload = await response.json();

    assert.equal(response.status, 401);
    assert.equal(payload.message, "Authentication required");
  });
});

test("PUT /api/users/profile rejects unknown update fields", async () => {
  const restore = stubUserModel({
    findById: () => ({
      select: async () => authUser({ password: undefined })
    }),
    findByIdAndUpdate: () => {
      throw new Error("findByIdAndUpdate should not be called for invalid payloads");
    }
  });

  try {
    await withServer(async (baseUrl) => {
      const token = signToken("user-id");
      const response = await fetch(`${baseUrl}/api/users/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ role: "admin" })
      });
      const payload = await response.json();

      assert.equal(response.status, 400);
      assert.match(payload.message, /Champs non autorises/);
    });
  } finally {
    restore();
  }
});

test("PUT /api/users/profile accepts allowed preference fields", async () => {
  const restore = stubUserModel({
    findById: () => ({
      select: async () => authUser({ password: undefined })
    }),
    findByIdAndUpdate: (_id, update, options) => ({
      select: async () => authUser({
        password: undefined,
        householdSize: update.householdSize,
        enabledMealTypes: update.enabledMealTypes,
        availableEquipments: update.availableEquipments,
        options
      })
    })
  });

  try {
    await withServer(async (baseUrl) => {
      const token = signToken("user-id");
      const response = await fetch(`${baseUrl}/api/users/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          householdSize: 3,
          enabledMealTypes: ["lunch", "dinner"],
          availableEquipments: ["four"]
        })
      });
      const payload = await response.json();

      assert.equal(response.status, 200);
      assert.equal(payload.householdSize, 3);
      assert.deepEqual(payload.enabledMealTypes, ["lunch", "dinner"]);
      assert.deepEqual(payload.availableEquipments, ["four"]);
      assert.equal(payload.options.runValidators, true);
    });
  } finally {
    restore();
  }
});
