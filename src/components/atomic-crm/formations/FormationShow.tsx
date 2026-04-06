import { useGetOne, useGetList, useDelete, useNotify } from "ra-core";
import { useParams, useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Pencil,
  Trash2,
  Plus,
  Clock,
  GraduationCap,
  Euro,
  BookOpen,
} from "lucide-react";
import { statusColors, domaineColors } from "./constants";
import { useSessionDialog, SessionDialog } from "./SessionDialog";

const FormationShow = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const notify = useNotify();
  const [deleteOne] = useDelete();
  const { data: formation, isPending } = useGetOne("formations", {
    id: Number(id),
  });
  const { data: sessions } = useGetList("training_sessions", {
    filter: { formation_id: Number(id) },
    sort: { field: "start_date", order: "ASC" },
    pagination: { page: 1, perPage: 50 },
  });

  const sessionDialog = useSessionDialog(Number(id));

  if (isPending)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse text-muted-foreground">
          Chargement...
        </div>
      </div>
    );
  if (!formation)
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Formation introuvable
      </div>
    );

  const handleDeleteFormation = () => {
    if (!confirm("Supprimer cette formation ?")) return;
    deleteOne(
      "formations",
      { id: Number(id), previousData: formation },
      {
        onSuccess: () => {
          notify("Formation supprimée", { type: "success" });
          navigate("/formations");
        },
        onError: () =>
          notify("Erreur lors de la suppression", { type: "error" }),
      },
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/formations")}
          className="text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" /> Formations
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/formations/${id}`)}
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Modifier
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDeleteFormation}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative rounded-xl overflow-hidden bg-muted">
        {formation.image?.src ? (
          <div className="relative h-56 md:h-64">
            <img
              src={formation.image.src}
              alt={formation.nom}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">
                    {formation.nom}
                  </h1>
                  {formation.sous_titre && (
                    <p className="text-white/80 text-sm">
                      {formation.sous_titre}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {formation.statut && (
                    <Badge
                      variant={
                        formation.statut === "Active" ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {formation.statut}
                    </Badge>
                  )}
                  {formation.domaine_artistique && (
                    <span
                      className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${domaineColors[formation.domaine_artistique] || "bg-gray-100 text-gray-800"}`}
                    >
                      {formation.domaine_artistique}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 py-8 bg-linear-to-r from-primary/5 to-primary/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-1">
                  {formation.nom}
                </h1>
                {formation.sous_titre && (
                  <p className="text-muted-foreground text-sm">
                    {formation.sous_titre}
                  </p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {formation.statut && (
                  <Badge
                    variant={
                      formation.statut === "Active" ? "default" : "secondary"
                    }
                    className="text-xs"
                  >
                    {formation.statut}
                  </Badge>
                )}
                {formation.domaine_artistique && (
                  <span
                    className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full ${domaineColors[formation.domaine_artistique] || "bg-gray-100 text-gray-800"}`}
                  >
                    {formation.domaine_artistique}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {formation.duree_jours && (
          <Card className="border-0 shadow-sm bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Clock className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                  Durée
                </p>
                <p className="text-sm font-semibold">
                  {formation.duree_jours} jour
                  {formation.duree_jours > 1 ? "s" : ""}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        {formation.lieu_principal && (
          <Card className="border-0 shadow-sm bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                  Lieu
                </p>
                <p className="text-sm font-semibold">
                  {formation.lieu_principal}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        {formation.prix_catalogue && (
          <Card className="border-0 shadow-sm bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-50 flex items-center justify-center">
                <Euro className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                  Prix
                </p>
                <p className="text-sm font-semibold">
                  {Number(formation.prix_catalogue).toLocaleString("fr-FR")} €
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        {formation.format && (
          <Card className="border-0 shadow-sm bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-violet-50 flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-violet-600" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                  Format
                </p>
                <p className="text-sm font-semibold">{formation.format}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Description */}
      {formation.accroche && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Description</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {formation.accroche}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sessions Section */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Sessions</h3>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {sessions?.length || 0}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={sessionDialog.openCreate}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
            </Button>
          </div>

          {!sessions?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Calendar className="h-8 w-8 mb-3 opacity-40" />
              <p className="text-sm font-medium">Aucune session planifiée</p>
              <p className="text-xs mt-1">
                Cliquez sur "Ajouter" pour créer la première session
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {sessions.map((session: any) => (
                <div
                  key={session.id}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40 transition-colors cursor-pointer group"
                  onClick={() => sessionDialog.openEdit(session)}
                >
                  <span
                    className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${statusColors[session.status] || "bg-gray-50 text-gray-600"}`}
                  >
                    {session.status}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">
                      {session.session_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                    {session.start_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(session.start_date).toLocaleDateString(
                          "fr-FR",
                          { day: "numeric", month: "short" },
                        )}
                        {session.end_date &&
                          ` → ${new Date(session.end_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`}
                      </span>
                    )}
                    {session.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {session.location}
                      </span>
                    )}
                    {session.capacity && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {session.capacity}
                      </span>
                    )}
                  </div>
                  <div
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => sessionDialog.openEdit(session)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => sessionDialog.handleDelete(session)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SessionDialog
        dialogMode={sessionDialog.dialogMode}
        form={sessionDialog.form}
        updateField={sessionDialog.updateField}
        handleSave={sessionDialog.handleSave}
        onClose={() => sessionDialog.setDialogMode(null)}
        hideFormationField
      />
    </div>
  );
};

export default FormationShow;
