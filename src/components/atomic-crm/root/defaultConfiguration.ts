import type { ConfigurationContextValue } from "./ConfigurationContext";

export const defaultDarkModeLogo = "./logos/logo_aibs_dark.svg";
export const defaultLightModeLogo = "./logos/logo_aibs_light.svg";

export const defaultCurrency = "EUR";

export const defaultTitle = "Art International Business School";

export const defaultCompanySectors = [
  { value: "audiovisuel", label: "Audiovisuel" },
  { value: "cinema", label: "Cinéma" },
  { value: "musique", label: "Musique" },
  { value: "theatre", label: "Théâtre" },
  { value: "doublage-voix", label: "Doublage & Voix" },
  { value: "production", label: "Production" },
  { value: "agence-casting", label: "Agence / Casting" },
  { value: "diffusion", label: "Diffusion & Streaming" },
  { value: "formation", label: "Formation" },
  { value: "autre", label: "Autre" },
];

export const defaultDealStages = [
  { value: "nouveau-lead", label: "Nouveau lead" },
  { value: "contacte-wa", label: "Contacté WA" },
  { value: "a-rappeler", label: "À rappeler" },
  { value: "qualifie", label: "Qualifié" },
  { value: "qualifie-afdas", label: "Qualifié AFDAS" },
  { value: "inscrit", label: "Inscrit" },
  { value: "converti", label: "Converti" },
  { value: "perdu", label: "Perdu" },
];

export const defaultDealPipelineStatuses = ["inscrit"];

export const defaultDealCategories = [
  { value: "autre", label: "Autre" },
  { value: "acteur-leader", label: "Acteur Leader" },
  { value: "court-metrage", label: "Court-métrage" },
  { value: "doublage-voix", label: "Doublage & Voix" },
  { value: "pro-tools-mixage", label: "Pro Tools & Mixage" },
  { value: "cannes-networking", label: "Cannes Networking" },
  { value: "residence-musicale", label: "Résidence Musicale" },
];

export const defaultNoteStatuses = [
  { value: "froid", label: "Froid", color: "#7dbde8" },
  { value: "tiede", label: "Tiède", color: "#e8cb7d" },
  { value: "chaud", label: "Chaud", color: "#E35D4D" },
  { value: "inscrit", label: "Inscrit", color: "#a4e87d" },
];

export const defaultTaskTypes = [
  { value: "none", label: "Aucun" },
  { value: "email", label: "Email" },
  { value: "appel", label: "Appel" },
  { value: "reunion", label: "Réunion" },
  { value: "relance", label: "Relance" },
  { value: "inscription", label: "Inscription" },
  { value: "suivi", label: "Suivi" },
  { value: "demo", label: "Présentation" },
];

export const defaultConfiguration: ConfigurationContextValue = {
  companySectors: defaultCompanySectors,
  currency: defaultCurrency,
  dealCategories: defaultDealCategories,
  dealPipelineStatuses: defaultDealPipelineStatuses,
  dealStages: defaultDealStages,
  noteStatuses: defaultNoteStatuses,
  taskTypes: defaultTaskTypes,
  title: defaultTitle,
  darkModeLogo: defaultDarkModeLogo,
  lightModeLogo: defaultLightModeLogo,
};
