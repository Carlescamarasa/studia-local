import { localDataClient } from './localDataClient';

export const Pieza = localDataClient.entities.Pieza;
export const Plan = localDataClient.entities.Plan;
export const Asignacion = localDataClient.entities.Asignacion;
export const Bloque = localDataClient.entities.Bloque;
export const RegistroSesion = localDataClient.entities.RegistroSesion;
export const RegistroBloque = localDataClient.entities.RegistroBloque;
export const FeedbackSemanal = localDataClient.entities.FeedbackSemanal;
export const StudentBackpack = localDataClient.entities.StudentBackpack;

// auth sdk:
export const User = localDataClient.auth;