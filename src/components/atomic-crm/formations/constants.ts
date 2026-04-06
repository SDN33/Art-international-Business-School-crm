export const statusChoices = [
  { id: "Ouverte", name: "Ouverte" },
  { id: "Fermée", name: "Fermée" },
  { id: "Complète", name: "Complète" },
  { id: "Annulée", name: "Annulée" },
];

export const statusColors: Record<string, string> = {
  Ouverte: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20",
  Fermée: "bg-gray-50 text-gray-600 ring-1 ring-gray-500/20",
  Complète: "bg-rose-50 text-rose-700 ring-1 ring-rose-600/20",
  Annulée: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
};

export type Session = {
  id: number;
  session_name: string;
  formation_id: number | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  capacity: number | null;
  status: string | null;
  notes: string | null;
};

export type SessionFormData = {
  session_name: string;
  formation_id: string;
  start_date: string;
  end_date: string;
  location: string;
  capacity: string;
  status: string;
  notes: string;
};

export const emptySessionForm: SessionFormData = {
  session_name: "",
  formation_id: "",
  start_date: "",
  end_date: "",
  location: "",
  capacity: "",
  status: "Ouverte",
  notes: "",
};

export const domaineColors: Record<string, string> = {
  Cinéma: "bg-blue-50 text-blue-700 ring-1 ring-blue-700/10",
  Production: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-700/10",
  Doublage: "bg-violet-50 text-violet-700 ring-1 ring-violet-700/10",
  Musique: "bg-amber-50 text-amber-700 ring-1 ring-amber-700/10",
  Théâtre: "bg-pink-50 text-pink-700 ring-1 ring-pink-700/10",
};
