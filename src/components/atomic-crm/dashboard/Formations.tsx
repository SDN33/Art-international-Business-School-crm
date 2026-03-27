import { Calendar, Clock, MapPin, Users, Euro } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Formation = {
  id: number;
  emoji: string;
  title: string;
  subtitle: string;
  dates: string;
  duration: string;
  hours: string;
  lieu: string;
  description: string;
  objectifs: string[];
  intervenants: string[];
  pointsForts: string[];
  financement: string;
  badgeStyle: string;
};

const formations: Formation[] = [
  {
    id: 1,
    emoji: "🎬",
    title: "Acteur Leader",
    subtitle: "Travail face caméra & stratégie de carrière",
    dates: "7 – 11 avril 2026",
    duration: "5 jours intensifs",
    hours: "40h",
    lieu: "Paris (présentiel)",
    description:
      "Plongez au cœur du métier d'acteur avec une formation immersive alliant jeu face caméra, technique de self-tape et stratégie de carrière. Encadrée par des professionnels reconnus du secteur.",
    objectifs: [
      "Maîtriser le jeu face caméra (justesse, intention, précision)",
      "Comprendre les attentes des directeurs de casting",
      "Réaliser des self-tapes professionnels et impactants",
      "Identifier sa typologie de rôles et son positionnement",
      "Développer une stratégie de carrière concrète",
    ],
    intervenants: [
      "Ludmilla Donn – Directrice de casting",
      "Léa Frédeval – Réalisatrice de long métrage",
      "Laetitia Eïdo – Actrice (Netflix)",
      "Nicolas Benoît – Directeur de casting",
      "Pauline Nyrls – Spécialiste casting & self-tape",
      "Caroline Sol – Productrice & stratégie de carrière",
    ],
    pointsForts: [
      "Retours directs de professionnels en activité",
      "Approche complète : artistique + stratégique",
      "Mise en situation réelle de casting",
      "Accompagnement personnalisé",
    ],
    financement: "Éligible AFDAS, France Travail (sous conditions)",
    badgeStyle: "#E35D4D",
  },
  {
    id: 2,
    emoji: "🎬",
    title: "Écrire, financer et produire son court-métrage",
    subtitle: "Formation intensive – 9 jours",
    dates: "7 – 17 avril 2026",
    duration: "9 jours intensifs",
    hours: "72h",
    lieu: "Paris (présentiel)",
    description:
      "Concevez, structurez et financez votre court-métrage aux côtés de professionnels de haut niveau, dont un producteur oscarisé. Formation vous accompagnant de l'écriture à la stratégie de financement.",
    objectifs: [
      "Écrire un court-métrage structuré et impactant",
      "Maîtriser les fondamentaux du storytelling",
      "Comprendre les attentes du marché (producteurs, diffuseurs, festivals)",
      "Construire un dossier de financement solide",
      "Développer une stratégie de production et de diffusion",
    ],
    intervenants: [
      "Producteur oscarisé – Vision stratégique & financement",
      "Professionnels de l'audiovisuel",
      "Caroline Sol – Productrice, stratégie & accompagnement",
    ],
    pointsForts: [
      "Formation orientée résultats concrets",
      "Approche terrain : méthodes utilisées par les pros",
      "Retours personnalisés sur votre projet",
      "Accès à une vision réaliste du marché",
    ],
    financement: "Éligible AFDAS, France Travail (sous conditions)",
    badgeStyle: "#143D4C",
  },
  {
    id: 3,
    emoji: "🎙️",
    title: "Doublage, voix-off & home studio",
    subtitle: "Formation intensive – 4 jours",
    dates: "27 – 30 avril 2026",
    duration: "4 jours intensifs",
    hours: "32h",
    lieu: "Paris (présentiel)",
    description:
      "Plongez dans l'univers du doublage professionnel et de la voix-off aux côtés de spécialistes reconnus (cinéma, séries, publicité, documentaire). Apprenez à produire vos enregistrements en toute autonomie.",
    objectifs: [
      "Maîtriser les techniques de doublage (jeu, synchronisation, intention)",
      "Comprendre les exigences des productions",
      "Développer une voix-off professionnelle",
      "Créer et optimiser son home studio",
      "Gagner en employabilité sur les marchés du doublage",
    ],
    intervenants: [
      "Fannie Brett – Directrice de doublage (Netflix)",
      "Max Rabault – Directeur de doublage (Netflix)",
      "Mathieu Richer – Directeur de plateau",
      "Ingénieurs du son spécialisés voix-off & postproduction",
      "Caroline Sol – Production & stratégie de carrière",
    ],
    pointsForts: [
      "Immersion en studios professionnels",
      "Encadrement par des experts Netflix",
      "Double compétence : artistique + technique",
      "Autonomie immédiate après la formation",
    ],
    financement: "Éligible AFDAS, France Travail (sous conditions)",
    badgeStyle: "#E35D4D",
  },
  {
    id: 4,
    emoji: "🎚️",
    title: "Pro Tools & mixage en studio professionnel",
    subtitle: "Formation intensive – 5 jours",
    dates: "11 – 15 mai 2026",
    duration: "5 jours intensifs",
    hours: "40h",
    lieu: "Paris (présentiel)",
    description:
      "Apprenez à mixer comme un professionnel dans un studio haut de gamme ayant collaboré avec Bigflo et Oli. Développez des compétences techniques immédiatement exploitables.",
    objectifs: [
      "Maîtriser le logiciel Pro Tools",
      "Comprendre les fondamentaux du mixage audio",
      "Traiter une session multipiste (voix, musique, sound design)",
      "Utiliser les plugins professionnels (EQ, compression, reverb…)",
      "Exporter et livrer un mix selon les standards du marché",
    ],
    intervenants: [
      "Ingénieurs du son professionnels (musique & audiovisuel)",
      "Intervenants ayant travaillé sur des productions reconnues",
      "Accompagnement personnalisé en studio",
    ],
    pointsForts: [
      "Accès à un vrai studio professionnel",
      "Formation orientée pratique (learning by doing)",
      "Acquisition d'une compétence technique recherchée",
      "Compatible musique, audiovisuel, podcast, voix-off",
    ],
    financement: "Éligible AFDAS, France Travail (sous conditions)",
    badgeStyle: "#143D4C",
  },
  {
    id: 5,
    emoji: "🎬",
    title: "Networking & stratégie Festival de Cannes",
    subtitle: "Se positionner, pitcher et développer son réseau",
    dates: "16 & 17 mai 2026",
    duration: "2 jours intensifs",
    hours: "14h",
    lieu: "Paris (10h–17h)",
    description:
      "Préparez-vous à exploiter pleinement le potentiel du Festival de Cannes. Comprenez les codes, développez votre posture et apprenez à transformer chaque rencontre en opportunité concrète.",
    objectifs: [
      "Comprendre le fonctionnement réel du Festival de Cannes",
      "Savoir identifier les bons interlocuteurs et opportunités",
      "Structurer un elevator pitch percutant",
      "Développer une posture professionnelle et impactante",
      "Savoir se vendre de manière claire et authentique",
    ],
    intervenants: [
      "Caroline Sol – Productrice audiovisuelle & experte en stratégie de carrière",
    ],
    pointsForts: [
      "Formation ultra concrète et directement applicable",
      "Approche stratégique (non théorique)",
      "Exercices pratiques et mises en situation",
      "Adaptée aux artistes, acteurs, réalisateurs, producteurs",
    ],
    financement: "Éligible AFDAS, France Travail (sous conditions)",
    badgeStyle: "#E35D4D",
  },
  {
    id: 6,
    emoji: "🎶",
    title: "Créer, enregistrer et lancer son single",
    subtitle: "Résidence artistique – 5 jours",
    dates: "8 – 12 juin 2026",
    duration: "5 jours intensifs",
    hours: "40h",
    lieu: "Résidence à la campagne",
    description:
      "Vivez une expérience unique en résidence artistique pour écrire, enregistrer et structurer le lancement de votre single dans un environnement propice à la création.",
    objectifs: [
      "Écrire et structurer un single (texte, mélodie, intention)",
      "Développer son identité artistique",
      "Enregistrer en studio dans des conditions professionnelles",
      "Comprendre les étapes de production musicale",
      "Construire une stratégie de lancement",
    ],
    intervenants: [
      "2 ingénieurs du son professionnels (enregistrement & mixage)",
      "Caroline Sol – Productrice & stratégie artistique",
      "Accompagnement personnalisé tout au long de la résidence",
    ],
    pointsForts: [
      "Format résidence immersive (focus total sur la création)",
      "Accompagnement artistique + technique + stratégique",
      "Enregistrement en studio professionnel",
      "Cadre inspirant, propice à la créativité",
    ],
    financement: "Éligible AFDAS, France Travail (sous conditions)",
    badgeStyle: "#143D4C",
  },
];

export const Formations = () => (
  <div className="flex flex-col gap-4">
    <h2 className="text-xl font-bold text-foreground">
      Nos formations 2026
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {formations.map((f) => (
        <FormationCard key={f.id} formation={f} />
      ))}
    </div>
  </div>
);

const FormationCard = ({ formation: f }: { formation: Formation }) => (
  <Card className="flex flex-col h-full border-border hover:shadow-md transition-shadow">
    <CardHeader className="pb-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl">{f.emoji}</span>
        <Badge className="text-white text-xs shrink-0" style={{ backgroundColor: f.badgeStyle }}>
          {f.hours}
        </Badge>
      </div>
      <CardTitle className="text-base leading-tight mt-2">{f.title}</CardTitle>
      <p className="text-xs text-muted-foreground">{f.subtitle}</p>
    </CardHeader>

    <CardContent className="flex flex-col gap-3 flex-1">
      {/* Date / Duration / Location */}
      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 shrink-0" />
          {f.dates}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 shrink-0" />
          {f.duration}
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3 w-3 shrink-0" />
          {f.lieu}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">
        {f.description}
      </p>

      {/* Objectifs */}
      <div>
        <p className="text-xs font-semibold mb-1 text-foreground">
          🎯 Objectifs
        </p>
        <ul className="space-y-0.5">
          {f.objectifs.slice(0, 3).map((o, i) => (
            <li key={i} className="text-xs text-foreground/75 flex gap-1.5">
              <span className="text-[#E35D4D] shrink-0 mt-0.5">•</span>
              {o}
            </li>
          ))}
          {f.objectifs.length > 3 && (
            <li className="text-xs text-muted-foreground italic">
              + {f.objectifs.length - 3} autres objectifs
            </li>
          )}
        </ul>
      </div>

      {/* Intervenants */}
      <div>
        <p className="text-xs font-semibold mb-1 text-foreground flex items-center gap-1">
          <Users className="h-3 w-3" /> Intervenants
        </p>
        <ul className="space-y-0.5">
          {f.intervenants.slice(0, 2).map((iv, i) => (
            <li key={i} className="text-xs text-foreground/75">
              {iv}
            </li>
          ))}
          {f.intervenants.length > 2 && (
            <li className="text-xs text-muted-foreground italic">
              + {f.intervenants.length - 2} autres
            </li>
          )}
        </ul>
      </div>

      {/* Financement */}
      <div className="mt-auto pt-2 border-t border-border">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Euro className="h-3 w-3 shrink-0" />
          {f.financement}
        </span>
      </div>
    </CardContent>
  </Card>
);
