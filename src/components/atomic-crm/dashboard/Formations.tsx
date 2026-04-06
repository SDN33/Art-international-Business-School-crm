import { useGetList } from "ra-core";
import { Calendar, Clock, MapPin, Users, Euro, ExternalLink, GraduationCap } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type FormationRecord = {
  id: number;
  nom: string;
  sous_titre: string | null;
  description: string | null;
  accroche: string | null;
  date_texte: string | null;
  duree_texte: string | null;
  duree_jours: number | null;
  lieu_principal: string | null;
  objectifs: string | null;
  intervenants_texte: string | null;
  points_forts: string | null;
  statut: string | null;
  image: { src: string } | null;
  domaine_artistique: string | null;
  ordre: number | null;
};

// Fallback images by formation name keyword
const FALLBACK_IMAGES: Record<string, string> = {
  "acteur": "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&q=80&fit=crop",
  "court-métrage": "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=600&q=80&fit=crop",
  "doublage": "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=600&q=80&fit=crop",
  "pro tools": "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&q=80&fit=crop",
  "cannes": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80&fit=crop",
  "single": "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&q=80&fit=crop",
};

const BADGE_COLORS = ["#E35D4D", "#143D4C"];

function getFallbackImage(nom: string): string | null {
  const lower = nom.toLowerCase();
  for (const [key, url] of Object.entries(FALLBACK_IMAGES)) {
    if (lower.includes(key)) return url;
  }
  return null;
}

function splitLines(text: string | null): string[] {
  if (!text) return [];
  return text.split("\n").map((l) => l.trim()).filter(Boolean);
}

export const Formations = () => {
  const { data, isPending } = useGetList<FormationRecord>("formations", {
    pagination: { page: 1, perPage: 50 },
    sort: { field: "ordre", order: "ASC" },
    filter: {},
  });

  const formations = (data ?? []).filter((f) => f.nom && f.nom !== "(sans nom)");

  if (isPending) return null;
  if (!formations.length) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Nos formations 2026</h2>
        <a
          href="https://www.artinternationalbusinessschool.com/"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          Voir toutes les formations <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {formations.map((f, i) => (
          <FormationCard key={f.id} formation={f} colorIndex={i} />
        ))}
      </div>
    </div>
  );
};

const FormationCard = ({
  formation: f,
  colorIndex,
}: {
  formation: FormationRecord;
  colorIndex: number;
}) => {
  const imageSrc = f.image?.src ?? getFallbackImage(f.nom);
  const objectifs = splitLines(f.objectifs);
  const intervenants = splitLines(f.intervenants_texte);
  const hours = f.duree_jours ? `${Math.round(Number(f.duree_jours) * 8)}h` : null;
  const badgeColor = BADGE_COLORS[colorIndex % BADGE_COLORS.length];

  return (
    <Card className="flex flex-col h-full border-border hover:shadow-md transition-shadow overflow-hidden">
      {/* Hero image */}
      <div className="relative h-36 overflow-hidden bg-muted">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={f.nom}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <GraduationCap className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2">
          <span className="text-xl">🎬</span>
          {hours && (
            <Badge className="text-white text-xs shrink-0" style={{ backgroundColor: badgeColor }}>
              {hours}
            </Badge>
          )}
        </div>
      </div>

      <CardHeader className="pb-3 pt-3">
        <CardTitle className="text-base leading-tight">{f.nom}</CardTitle>
        {f.sous_titre && (
          <p className="text-xs text-muted-foreground">{f.sous_titre}</p>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-3 flex-1">
        {/* Date / Duration / Location */}
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          {f.date_texte && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 shrink-0" />
              {f.date_texte}
            </span>
          )}
          {f.duree_texte && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 shrink-0" />
              {f.duree_texte}
            </span>
          )}
          {f.lieu_principal && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 shrink-0" />
              {f.lieu_principal}
            </span>
          )}
        </div>

        {/* Description */}
        {f.description && (
          <p className="text-xs text-foreground/80 leading-relaxed line-clamp-3">
            {f.description}
          </p>
        )}

        {/* Objectifs */}
        {objectifs.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-1 text-foreground">
              🎯 Objectifs
            </p>
            <ul className="space-y-0.5">
              {objectifs.slice(0, 3).map((o, i) => (
                <li key={i} className="text-xs text-foreground/75 flex gap-1.5">
                  <span className="text-primary shrink-0 mt-0.5">•</span>
                  {o}
                </li>
              ))}
              {objectifs.length > 3 && (
                <li className="text-xs text-muted-foreground italic">
                  + {objectifs.length - 3} autres objectifs
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Intervenants */}
        {intervenants.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-1 text-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> Intervenants
            </p>
            <ul className="space-y-0.5">
              {intervenants.slice(0, 2).map((iv, i) => (
                <li key={i} className="text-xs text-foreground/75">
                  {iv}
                </li>
              ))}
              {intervenants.length > 2 && (
                <li className="text-xs text-muted-foreground italic">
                  + {intervenants.length - 2} autres
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Financement + CTA */}
        <div className="mt-auto pt-2 border-t border-border flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Euro className="h-3 w-3 shrink-0" />
            Éligible AFDAS
          </span>
          <a
            href="https://www.artinternationalbusinessschool.com/"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-0.5 shrink-0"
          >
            S'inscrire <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
};
