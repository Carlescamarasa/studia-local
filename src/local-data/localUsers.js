export const localUsers = [
  { 
    id: "u-admin", 
    rolPersonalizado: "ADMIN", 
    nombreCompleto: "Admin Local", 
    full_name: "Admin Local",
    email: "admin@local",
    first_name: "Admin",
    last_name: "Local"
  },
  { 
    id: "u-prof", 
    rolPersonalizado: "PROF", 
    nombreCompleto: "Profesor Local", 
    full_name: "Profesor Local",
    email: "prof@local",
    first_name: "Profesor",
    last_name: "Local"
  },
  { 
    id: "u-estu1", 
    rolPersonalizado: "ESTU", 
    nombreCompleto: "Estudiante 1", 
    full_name: "Estudiante 1",
    email: "estu1@local",
    first_name: "Estudiante",
    last_name: "1",
    profesorAsignadoId: "u-prof"
  },
  { 
    id: "u-estu2", 
    rolPersonalizado: "ESTU", 
    nombreCompleto: "Estudiante 2", 
    full_name: "Estudiante 2",
    email: "estu2@local",
    first_name: "Estudiante",
    last_name: "2",
    profesorAsignadoId: "u-prof"
  }
];
