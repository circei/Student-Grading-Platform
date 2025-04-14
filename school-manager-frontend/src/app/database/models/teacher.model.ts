export interface Professor {
  id: number;
  name: string;
  email: string;
  department: string;
  // Am adăugat opțional materii predate
  coursesTaught?: string[];
}