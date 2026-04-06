import { BookOpen, ChevronDown, ClipboardList, CreditCard, FileText, Import, Kanban, Mail, MessageSquare, Settings, User, Users } from "lucide-react";
import { CanAccess, useTranslate, useUserMenu } from "ra-core";
import { Link, matchPath, useLocation } from "react-router";
import { RefreshButton } from "@/components/admin/refresh-button";
import { ThemeModeToggle } from "@/components/admin/theme-mode-toggle";
import { UserMenu } from "@/components/admin/user-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useConfigurationContext } from "../root/ConfigurationContext";
import { ImportPage } from "../misc/ImportPage";

const Header = () => {
  const { darkModeLogo, lightModeLogo, title } = useConfigurationContext();
  const location = useLocation();

  let currentPath: string | boolean = "/";
  if (matchPath("/", location.pathname)) {
    currentPath = "/";
  } else if (
    matchPath("/formations/*", location.pathname) ||
    matchPath("/training_sessions/*", location.pathname) ||
    matchPath("/intervenants/*", location.pathname)
  ) {
    currentPath = "/formations";
  } else if (
    matchPath("/deals/*", location.pathname) ||
    matchPath("/contacts/*", location.pathname) ||
    matchPath("/companies/*", location.pathname) ||
    matchPath("/leads-liste", location.pathname) ||
    matchPath("/interactions/*", location.pathname) ||
    matchPath("/newsletter_subscribers/*", location.pathname)
  ) {
    currentPath = "/pipeline";
  } else if (
    matchPath("/paiements/*", location.pathname) ||
    matchPath("/taches", location.pathname) ||
    matchPath("/documents", location.pathname)
  ) {
    currentPath = "/suivi";
  } else {
    currentPath = false;
  }

  return (
    <>
      <nav className="grow">
        <header className="bg-secondary">
          <div className="px-4">
            <div className="flex justify-between items-center flex-1">
              <Link
                to="/"
                className="flex items-center gap-2 text-secondary-foreground no-underline"
              >
                <img
                  className="[.light_&]:hidden h-6"
                  src={darkModeLogo}
                  alt={title}
                />
                <img
                  className="[.dark_&]:hidden h-6"
                  src={lightModeLogo}
                  alt={title}
                />
                <h1 className="text-xl font-semibold">{title}</h1>
              </Link>
              <div>
                <nav className="flex">
                  <NavigationTab
                    label="KPI"
                    to="/"
                    isActive={currentPath === "/"}
                  />
                  <FormationDropdown isActive={currentPath === "/formations"} />
                  <PipelineDropdown isActive={currentPath === "/pipeline"} />
                  <SuiviDropdown isActive={currentPath === "/suivi"} />
                </nav>
              </div>
              <div className="flex items-center">
                <ThemeModeToggle />
                <RefreshButton />
                <UserMenu>
                  <ProfileMenu />
                  <CanAccess resource="sales" action="list">
                    <UsersMenu />
                  </CanAccess>
                  <CanAccess resource="configuration" action="edit">
                    <SettingsMenu />
                  </CanAccess>
                  <ImportFromJsonMenuItem />
                </UserMenu>
              </div>
            </div>
          </div>
        </header>
      </nav>
    </>
  );
};

const NavigationTab = ({
  label,
  to,
  isActive,
}: {
  label: string;
  to: string;
  isActive: boolean;
}) => (
  <Link
    to={to}
    className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
      isActive
        ? "text-secondary-foreground border-secondary-foreground"
        : "text-secondary-foreground/70 border-transparent hover:text-secondary-foreground/80"
    }`}
  >
    {label}
  </Link>
);

const UsersMenu = () => {
  const translate = useTranslate();
  const userMenuContext = useUserMenu();
  if (!userMenuContext) {
    throw new Error("<UsersMenu> must be used inside <UserMenu?");
  }
  return (
    <DropdownMenuItem asChild onClick={userMenuContext.onClose}>
      <Link to="/sales" className="flex items-center gap-2">
        <Users />
        {translate("resources.sales.name", { smart_count: 2 })}
      </Link>
    </DropdownMenuItem>
  );
};

const ProfileMenu = () => {
  const translate = useTranslate();
  const userMenuContext = useUserMenu();
  if (!userMenuContext) {
    throw new Error("<ProfileMenu> must be used inside <UserMenu?");
  }
  return (
    <DropdownMenuItem asChild onClick={userMenuContext.onClose}>
      <Link to="/profile" className="flex items-center gap-2">
        <User />
        {translate("crm.profile.title")}
      </Link>
    </DropdownMenuItem>
  );
};

const SettingsMenu = () => {
  const translate = useTranslate();
  const userMenuContext = useUserMenu();
  if (!userMenuContext) {
    throw new Error("<SettingsMenu> must be used inside <UserMenu>");
  }
  return (
    <DropdownMenuItem asChild onClick={userMenuContext.onClose}>
      <Link to="/settings" className="flex items-center gap-2">
        <Settings />
        {translate("crm.settings.title")}
      </Link>
    </DropdownMenuItem>
  );
};

const PipelineDropdown = ({ isActive }: { isActive: boolean }) => (
  <DropdownMenu>
    <DropdownMenuTrigger
      className={`flex items-center gap-1 px-6 py-3 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
        isActive
          ? "text-secondary-foreground border-secondary-foreground"
          : "text-secondary-foreground/70 border-transparent hover:text-secondary-foreground/80"
      }`}
    >
      <Kanban className="h-4 w-4" />
      Pipeline
      <ChevronDown className="h-3 w-3" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      <DropdownMenuItem asChild>
        <Link to="/deals" className="flex items-center gap-2">
          <Kanban className="h-4 w-4 text-muted-foreground" />
          Leads pipeline
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link to="/leads-liste" className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          Leads liste
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link to="/interactions" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          Interactions
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link to="/newsletter_subscribers" className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          Newsletter
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link to="/contacts" className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Contacts
        </Link>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

const SuiviDropdown = ({ isActive }: { isActive: boolean }) => (
  <DropdownMenu>
    <DropdownMenuTrigger
      className={`flex items-center gap-1 px-6 py-3 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
        isActive
          ? "text-secondary-foreground border-secondary-foreground"
          : "text-secondary-foreground/70 border-transparent hover:text-secondary-foreground/80"
      }`}
    >
      <ClipboardList className="h-4 w-4" />
      Suivi
      <ChevronDown className="h-3 w-3" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      <DropdownMenuItem asChild>
        <Link to="/paiements" className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          Paiements
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link to="/taches" className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          Tâches
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link to="/documents" className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Documents
        </Link>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

const FormationDropdown = ({ isActive }: { isActive: boolean }) => (
  <DropdownMenu>
    <DropdownMenuTrigger
      className={`flex items-center gap-1 px-6 py-3 text-sm font-medium transition-colors border-b-2 cursor-pointer ${
        isActive
          ? "text-secondary-foreground border-secondary-foreground"
          : "text-secondary-foreground/70 border-transparent hover:text-secondary-foreground/80"
      }`}
    >
      <BookOpen className="h-4 w-4" />
      Formation
      <ChevronDown className="h-3 w-3" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      <DropdownMenuItem asChild>
        <Link to="/formations" className="flex items-center gap-2">
          Formations catalogue
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link to="/training_sessions" className="flex items-center gap-2">
          Sessions
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link to="/intervenants" className="flex items-center gap-2">
          Intervenants
        </Link>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

const ImportFromJsonMenuItem = () => {
  const translate = useTranslate();
  const userMenuContext = useUserMenu();
  if (!userMenuContext) {
    throw new Error("<ImportFromJsonMenuItem> must be used inside <UserMenu>");
  }
  return (
    <DropdownMenuItem asChild onClick={userMenuContext.onClose}>
      <Link to={ImportPage.path} className="flex items-center gap-2">
        <Import />
        {translate("crm.header.import_data")}
      </Link>
    </DropdownMenuItem>
  );
};
export default Header;
