import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  Home,
  Kanban,
  Plus,
  ListTodo,
  Menu,
  Users,
  GraduationCap,
  CreditCard,
  FileText,
  Mail,
  MessageSquare,
  Settings,
  User,
} from "lucide-react";
import { useTranslate } from "ra-core";
import { Link, matchPath, useLocation, useMatch } from "react-router";
import { ContactCreateSheet } from "../contacts/ContactCreateSheet";
import { useState } from "react";
import { NoteCreateSheet } from "../notes/NoteCreateSheet";
import { TaskCreateSheet } from "../tasks/TaskCreateSheet";

export const MobileNavigation = () => {
  const location = useLocation();
  const translate = useTranslate();
  const [moreOpen, setMoreOpen] = useState(false);

  let currentPath: string | boolean = "/";
  if (matchPath("/", location.pathname)) {
    currentPath = "/";
  } else if (
    matchPath("/leads-liste", location.pathname) ||
    matchPath("/deals/*", location.pathname)
  ) {
    currentPath = "/leads";
  } else if (matchPath("/tasks/*", location.pathname)) {
    currentPath = "/tasks";
  } else {
    currentPath = false;
  }

  return (
    <>
      <nav
        aria-label={translate("crm.navigation.label")}
        className="fixed bottom-0 left-0 right-0 z-50 bg-secondary border-t border-border/40"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex justify-around items-center h-14">
          <NavigationButton
            href="/"
            Icon={Home}
            label="Accueil"
            isActive={currentPath === "/"}
          />
          <NavigationButton
            href="/leads-liste"
            Icon={Kanban}
            label="Pipeline"
            isActive={currentPath === "/leads"}
          />
          <CreateButton />
          <NavigationButton
            href="/tasks"
            Icon={ListTodo}
            label="Tâches"
            isActive={currentPath === "/tasks"}
          />
          <Button
            variant="ghost"
            className="flex-col gap-1 h-auto py-2 px-1 rounded-md w-16 text-muted-foreground"
            onClick={() => setMoreOpen(true)}
          >
            <Menu className="size-6" />
            <span className="text-[0.6rem] font-medium">Plus</span>
          </Button>
        </div>
      </nav>
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
};

const MoreSheet = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      >
        <SheetHeader className="text-left mb-4">
          <SheetTitle>Navigation</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-4 gap-3">
          <MoreNavItem href="/contacts" Icon={Users} label="Contacts" onClick={close} />
          <MoreNavItem href="/formations" Icon={GraduationCap} label="Formations" onClick={close} />
          <MoreNavItem href="/paiements" Icon={CreditCard} label="Paiements" onClick={close} />
          <MoreNavItem href="/documents" Icon={FileText} label="Documents" onClick={close} />
          <MoreNavItem href="/interactions" Icon={MessageSquare} label="Interactions" onClick={close} />
          <MoreNavItem href="/newsletter_subscribers" Icon={Mail} label="Newsletter" onClick={close} />
          <MoreNavItem href="/settings" Icon={Settings} label="Paramètres" onClick={close} />
          <MoreNavItem href="/profile" Icon={User} label="Profil" onClick={close} />
        </div>
      </SheetContent>
    </Sheet>
  );
};

const MoreNavItem = ({
  href,
  Icon,
  label,
  onClick,
}: {
  href: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  onClick: () => void;
}) => (
  <Link
    to={href}
    onClick={onClick}
    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-muted hover:bg-accent no-underline text-foreground transition-colors"
  >
    <Icon className="size-6 text-primary" />
    <span className="text-[0.65rem] font-medium text-center leading-tight">{label}</span>
  </Link>
);

const NavigationButton = ({
  href,
  Icon,
  label,
  isActive,
}: {
  href: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  isActive: boolean;
}) => (
  <Button
    asChild
    variant="ghost"
    className={cn(
      "flex-col gap-1 h-auto py-2 px-1 rounded-md w-16",
      isActive ? null : "text-muted-foreground",
    )}
  >
    <Link to={href}>
      <Icon className="size-6" />
      <span className="text-[0.6rem] font-medium">{label}</span>
    </Link>
  </Button>
);

const CreateButton = () => {
  const translate = useTranslate();
  const contact_id = useMatch("/contacts/:id/*")?.params.id;
  const [contactCreateOpen, setContactCreateOpen] = useState(false);
  const [noteCreateOpen, setNoteCreateOpen] = useState(false);
  const [taskCreateOpen, setTaskCreateOpen] = useState(false);

  return (
    <>
      <ContactCreateSheet
        open={contactCreateOpen}
        onOpenChange={setContactCreateOpen}
      />
      <NoteCreateSheet
        open={noteCreateOpen}
        onOpenChange={setNoteCreateOpen}
        contact_id={contact_id}
      />
      <TaskCreateSheet
        open={taskCreateOpen}
        onOpenChange={setTaskCreateOpen}
        contact_id={contact_id}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="default"
            size="icon"
            className="h-16 w-16 rounded-full -mt-3"
            aria-label={translate("ra.action.create")}
          >
            <Plus className="size-10" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem
            className="h-12 px-4 text-base"
            onSelect={() => {
              setContactCreateOpen(true);
            }}
          >
            {translate("resources.contacts.forcedCaseName")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="h-12 px-4 text-base"
            onSelect={() => {
              setNoteCreateOpen(true);
            }}
          >
            {translate("resources.notes.forcedCaseName")}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="h-12 px-4 text-base"
            onSelect={() => {
              setTaskCreateOpen(true);
            }}
          >
            {translate("resources.tasks.forcedCaseName")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
