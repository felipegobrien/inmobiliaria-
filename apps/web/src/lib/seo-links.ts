// Enlaces internos para SEO: ciudades y tipos destacados.
// Se usan en la portada y el pie de página para que Google
// descubra y enlace las páginas de aterrizaje (operación/ciudad/tipo).

import type { OperationType, PropertyType } from "@inmo/shared";

/** Ciudades principales de Colombia (nombre visible + slug de URL). */
export const TOP_CITIES: { name: string; slug: string }[] = [
  { name: "Bogotá", slug: "bogota" },
  { name: "Medellín", slug: "medellin" },
  { name: "Cali", slug: "cali" },
  { name: "Barranquilla", slug: "barranquilla" },
  { name: "Cartagena", slug: "cartagena" },
  { name: "Bucaramanga", slug: "bucaramanga" },
  { name: "Pereira", slug: "pereira" },
  { name: "Santa Marta", slug: "santa-marta" },
  { name: "Cúcuta", slug: "cucuta" },
  { name: "Manizales", slug: "manizales" },
  { name: "Villavicencio", slug: "villavicencio" },
  { name: "Ibagué", slug: "ibague" },
];

/** Tipos de inmueble destacados para enlazado interno. */
export const TOP_TYPES: PropertyType[] = [
  "apartamento",
  "casa",
  "apartaestudio",
  "local",
  "oficina",
  "finca",
];

export const OPERATIONS: OperationType[] = ["venta", "arriendo"];
