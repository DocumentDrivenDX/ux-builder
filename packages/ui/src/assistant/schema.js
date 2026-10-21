import data from "./renderable.json";

/* The components an agent may render, each with the JSON Schema its props
   must pass: the allow-list generated UI is limited to. */
export const RENDERABLE = data.components;

const typeOf = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v);
const fits = (v, t) => t === typeOf(v) || (t === "number" && typeOf(v) === "integer");

/* The problems with a value against the schema subset the catalogue uses
   (type, enum, properties, required, additionalProperties, items, minItems,
   maxItems, maxLength, minimum, maximum), each with its path. */
export function schemaProblems(schema, value, path = "props") {
  const out = [];
  if (schema.type) {
    const types = [].concat(schema.type);
    if (!types.some((t) => fits(value, t))) return [`${path} should be ${types.join(" or ")}`];
  }
  if (schema.enum && !schema.enum.includes(value)) out.push(`${path} should be one of ${schema.enum.join(", ")}`);
  if (typeof value === "string" && schema.maxLength != null && value.length > schema.maxLength) out.push(`${path} is longer than ${schema.maxLength}`);
  if (typeof value === "number") {
    if (schema.minimum != null && value < schema.minimum) out.push(`${path} is below ${schema.minimum}`);
    if (schema.maximum != null && value > schema.maximum) out.push(`${path} is above ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems != null && value.length < schema.minItems) out.push(`${path} needs at least ${schema.minItems} items`);
    if (schema.maxItems != null && value.length > schema.maxItems) out.push(`${path} has more than ${schema.maxItems} items`);
    if (schema.items) value.forEach((v, i) => out.push(...schemaProblems(schema.items, v, `${path}[${i}]`)));
  } else if (typeOf(value) === "object") {
    for (const k of schema.required ?? []) if (!(k in value) || value[k] === undefined) out.push(`${path}.${k} is required`);
    for (const [k, v] of Object.entries(value)) {
      const own = schema.properties?.[k];
      if (own) out.push(...schemaProblems(own, v, `${path}.${k}`));
      else if (schema.additionalProperties === false) out.push(`${path}.${k} is not a known prop`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === "object") out.push(...schemaProblems(schema.additionalProperties, v, `${path}.${k}`));
    }
  }
  return out;
}

/* Whether an agent may render a component with these props: { ok,
   problems }. Only components in RENDERABLE, with props that pass its
   schema, are ok. */
export function checkRenderable(component, props) {
  if (typeof component !== "string" || !Object.hasOwn(RENDERABLE, component)) return { ok: false, problems: [`${String(component)} is not a renderable component`] };
  const problems = schemaProblems(RENDERABLE[component], props ?? {});
  return { ok: problems.length === 0, problems };
}
