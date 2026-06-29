export function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

export function rejectUnknownFields(payload = {}, allowedFields = [], label = "payload") {
  const allowed = new Set(allowedFields);
  const unknown = Object.keys(payload || {}).filter((key) => !allowed.has(key));

  if (unknown.length) {
    throw badRequest(`Champs non autorises dans ${label}: ${unknown.join(", ")}`);
  }
}

export function pickAllowedFields(payload = {}, allowedFields = [], label = "payload") {
  rejectUnknownFields(payload, allowedFields, label);
  return Object.fromEntries(
    Object.entries(payload || {}).filter(([, value]) => value !== undefined)
  );
}
