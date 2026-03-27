import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Welcome = () => (
  <Card>
    <CardHeader className="px-4">
      <CardTitle>Bienvenue sur votre CRM</CardTitle>
    </CardHeader>
    <CardContent className="px-4">
      <p className="text-sm mb-4">
        Gérez vos contacts, prospects et inscriptions pour les formations{" "}
        <strong>Art International Business School</strong>.
      </p>
      <p className="text-sm mb-4">
        Cet espace démo vous permet d'explorer et de modifier les données. Il se
        réinitialise au rechargement. La version complète utilise Supabase comme
        backend.
      </p>
      <p className="text-sm">
        Site web :{" "}
        <a
          href="https://www.artinternationalbusinessschool.com/"
          target="_blank"
          rel="noreferrer"
          className="underline hover:no-underline"
        >
          artinternationalbusinessschool.com
        </a>
      </p>
    </CardContent>
  </Card>
);
