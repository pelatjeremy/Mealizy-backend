import test from "node:test";
import assert from "node:assert/strict";
import { pickAllowedFields, rejectUnknownFields } from "../src/utils/validatePayload.js";

test("rejectUnknownFields accepts known fields only", () => {
  assert.doesNotThrow(() => rejectUnknownFields({ title: "Courses" }, ["title"], "liste"));
});

test("rejectUnknownFields reports unknown fields with a clean 400 error", () => {
  assert.throws(
    () => rejectUnknownFields({ title: "Courses", userId: "other-user" }, ["title"], "liste"),
    (error) => {
      assert.equal(error.statusCode, 400);
      assert.match(error.message, /userId/);
      return true;
    }
  );
});

test("pickAllowedFields keeps allowed defined values", () => {
  assert.deepEqual(
    pickAllowedFields({ title: "Courses", status: undefined }, ["title", "status"], "liste"),
    { title: "Courses" }
  );
});
