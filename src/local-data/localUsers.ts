/**
 * Usuarios locales - Fuente de verdad
 * IDs actualizados con UUIDs de Supabase
 */
export const localUsers = [
  {
    id: "a1a9582f-2903-4bac-b456-08a8dd7a4d74", // UUID de Supabase
    rolPersonalizado: "ADMIN",
    nombreCompleto: "Carles Camarasa Botella",
    full_name: "Carles Camarasa Botella",
    email: "carlescamarasa@gmail.com",
    first_name: "Carles",
    last_name: "Camarasa Botella",
    estado: "activo",
    fechaRegistro: "2024-01-01T00:00:00Z"
  },
  {
    id: "7232a445-c1cb-43c6-9df4-ff663aa77f4f", // UUID de Supabase
    rolPersonalizado: "PROF",
    nombreCompleto: "Carles Profe",
    full_name: "Carles Profe",
    email: "carlescamarasa+profe@gmail.com",
    first_name: "Carles",
    last_name: "Profe",
    estado: "activo",
    fechaRegistro: "2024-01-01T00:00:00Z"
  },
  {
    id: "aeb71bd6-2443-49ea-84aa-fbb7f2ab5589", // UUID de Supabase
    rolPersonalizado: "ESTU",
    nombreCompleto: "Carles +01",
    full_name: "Carles +01",
    email: "carlescamarasa+1@gmail.com",
    first_name: "Carles",
    last_name: "+01",
    profesorAsignadoId: "7232a445-c1cb-43c6-9df4-ff663aa77f4f", // Carles Profe UUID
    estado: "activo",
    fechaRegistro: "2024-01-01T00:00:00Z"
  },
  {
    id: "77dcf831-6283-462a-83bd-f5c46b3cde28", // UUID de Supabase
    rolPersonalizado: "ESTU",
    nombreCompleto: "La Trompeta Sonará",
    full_name: "La Trompeta Sonará",
    email: "trompetasonara@gmail.com",
    first_name: "La Trompeta",
    last_name: "Sonará",
    profesorAsignadoId: "7232a445-c1cb-43c6-9df4-ff663aa77f4f", // Carles Profe UUID
    estado: "activo",
    fechaRegistro: "2024-01-01T00:00:00Z"
  }
];
