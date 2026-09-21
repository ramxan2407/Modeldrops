"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Search,
  Plus,
  Compass,
  Sparkles,
  Users,
  Folder,
  Images,
  Heart,
  ShoppingBag,
  ChevronDown,
  ChevronRight,
  Play,
  Star,
  Check,
  CheckCheck,
  SlidersHorizontal,
  Image as ImageIcon,
  Video,
  PanelTop,
  Settings2,
  Bell,
  HelpCircle,
  LogOut,
  Zap,
  Layers,
  ShieldCheck,
  Globe,
  MoreHorizontal,
  X,
  LoaderCircle,
  Upload,
  Download,
  RefreshCw,
  Clock,
  Coins,
  Lock,
  LayoutDashboard,
  Film,
  Clapperboard,
  Camera,
  Menu,
  CheckCircle2,
  Flag,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Toaster, toast } from "sonner";
import {
  UserDashboard,
  type PurchaseRecord,
} from "@/components/user-dashboard";
import SuperAdmin from "@/components/super-admin";
import LoraWorkspace from "@/components/lora-workspace";
import { ModelDropsBrand } from "@/components/model-drops-brand";
import { safeWorkspaceReturnTo } from "@/lib/navigation";
import {
  characters as defaultCharacters,
  categories,
  models as defaultModels,
  packages as defaultPackages,
  license,
  type Character,
} from "@/lib/catalog";

type Page =
  | "dashboard"
  | "discover"
  | "studio"
  | "marketplace"
  | "characters"
  | "explore"
  | "projects"
  | "library"
  | "favorites"
  | "creators"
  | "billing"
  | "settings"
  | "admin"
  | "train-lora"
  | "my-loras"
  | "admin-training";
type Generation = {
  id: string;
  prompt: string;
  characterId: string | null;
  modelId: string;
  status: string;
  cost: number;
  image: string;
  type: string;
  createdAt: string;
  settings: string;
  projectId?: string;
};
type Project = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
};
type Account = {
  balance: number;
  owned: string[];
  favorites: string[];
  projects: Project[];
  generations: Generation[];
  transactions: {
    id: string;
    amount: number;
    description: string;
    createdAt: string;
    balanceAfter: number;
  }[];
  notifications: { id: string; message: string; read: number }[];
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  name: string;
  email?: string;
  purchases?: {
    characterId: string;
    purchaseDate: string;
    licenseVersion: string;
    licenseSnapshot: string;
    priceCents: number;
  }[];
  defaultPrivate: boolean;
  creatorStatus?: string;
  listings?: any[];
};
const emptyAccount: Account = {
  balance: 0,
  owned: [],
  favorites: [],
  projects: [],
  generations: [],
  transactions: [],
  notifications: [],
  isAdmin: false,
  name: "Creator",
  defaultPrivate: true,
};
const navigation = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "studio", label: "Create content", icon: Sparkles },
  { id: "train-lora", label: "Train LoRA", icon: Upload },
];
const workspace = [
  { id: "characters", label: "My Characters", icon: Users },
  { id: "my-loras", label: "My LoRAs", icon: Layers },
  { id: "library", label: "Creations", icon: Images },
  { id: "projects", label: "Projects", icon: Folder },
];
const titles: Record<Page, string> = {
  dashboard: "Overview",
  discover: "Discover",
  studio: "Create content",
  marketplace: "Character marketplace",
  characters: "My Characters",
  explore: "Explore",
  projects: "Projects",
  library: "My Generations",
  favorites: "Favorites",
  creators: "Creator studio",
  billing: "Credits & billing",
  settings: "Settings",
  admin: "Super admin",
  "train-lora": "Train LoRA",
  "my-loras": "My LoRAs",
  "admin-training": "Training administration",
};
async function api(action: string, data?: unknown) {
  const r = await fetch(
    "/api/platform" + (data === undefined ? "?action=" + action : ""),
    data === undefined
      ? {}
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, data }),
        },
  );
  let result: any;
  try {
    result = await r.json();
  } catch {
    throw new Error("The studio is temporarily unavailable. Please try again.");
  }
  if (!r.ok)
    throw Object.assign(new Error(result.error || "Something went wrong"), {
      status: r.status,
    });
  return result;
}
function count(v: number) {
  return v.toLocaleString("en-US");
}
function Brand() {
  return <ModelDropsBrand />;
}
function NavButton({
  id,
  label,
  icon: Icon,
  page,
  navigate,
}: {
  id: string;
  label: string;
  icon: any;
  page: Page;
  navigate: (p: Page) => void;
}) {
  const { setOpenMobile } = useSidebar();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={page === id}
        className="nav-button"
        onClick={() => {
          navigate(id as Page);
          setOpenMobile(false);
        }}
      >
        <Icon size={18} />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
function WorkspaceMoreMenu({
  isAdmin,
  isSuperAdmin,
  onNavigate,
}: {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  onNavigate: (page: Page) => void;
}) {
  const { setOpenMobile } = useSidebar();
  const navigate = (page: Page) => {
    setOpenMobile(false);
    onNavigate(page);
  };
  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <SidebarMenuButton className="nav-button">
            <MoreHorizontal size={18} />
            <span>More tools</span>
            <ChevronDown size={14} />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="right"
          align="end"
          className="workspace-more-menu"
        >
          <DropdownMenuLabel>Discover</DropdownMenuLabel>
          {[
            { id: "discover", label: "Discover", icon: Compass },
            {
              id: "marketplace",
              label: "Marketplace",
              icon: ShoppingBag,
            },
            {
              id: "explore",
              label: "Explore inspiration",
              icon: Globe,
            },
            { id: "favorites", label: "Favorites", icon: Heart },
          ].map((n) => (
            <DropdownMenuItem
              key={n.id}
              onSelect={() => navigate(n.id as Page)}
            >
              <n.icon size={16} />
              {n.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Manage</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => navigate("creators")}>
            <Layers size={16} />
            Creator studio
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate("settings")}>
            <Settings2 size={16} />
            Account settings
          </DropdownMenuItem>
          {isSuperAdmin && (
            <DropdownMenuItem onSelect={() => navigate("admin")}>
              <ShieldCheck size={16} />
              Super admin
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
export default function ModelDropsApp({
  initialPage = "dashboard",
  initialCharacter,
}: {
  initialPage?: Page;
  initialCharacter?: string;
}) {
  const [page, setPage] = useState<Page>(initialPage),
    [account, setAccount] = useState<Account>(emptyAccount),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(""),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All characters"),
    [sort, setSort] = useState("trending");
  const [catalog, setCatalog] =
    useState<(Character & { enabled?: boolean })[]>(defaultCharacters);
  const characters = catalog.filter(
    (c) => c.enabled !== false || account.owned.includes(c.id),
  );
  const [detail, setDetail] = useState<Character | null>(null),
    [modal, setModal] = useState<
      "credits" | "project" | "notifications" | "license" | "help" | null
    >(null),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState(
      initialCharacter && characters.some((c) => c.id === initialCharacter)
        ? initialCharacter
        : "",
    ),
    [mode, setMode] = useState("image"),
    [modelId, setModelId] = useState("forma-image"),
    [prompt, setPrompt] = useState(""),
    [negative, setNegative] = useState(""),
    [ratio, setRatio] = useState("16:9"),
    [resolution, setResolution] = useState("1024"),
    [outputs, setOutputs] = useState("1"),
    [seed, setSeed] = useState(""),
    [duration, setDuration] = useState("5"),
    [advanced, setAdvanced] = useState(false),
    [projectName, setProjectName] = useState(""),
    [projectDescription, setProjectDescription] = useState(""),
    [activeProject, setActiveProject] = useState<string | null>(null),
    [asset, setAsset] = useState<Generation | null>(null),
    [libraryFilter, setLibraryFilter] = useState("all"),
    [registry, setRegistry] = useState(defaultModels),
    [creditPackages, setCreditPackages] = useState(defaultPackages),
    [profileName, setProfileName] = useState(""),
    [privateDefault, setPrivateDefault] = useState(true),
    [creatorName, setCreatorName] = useState(""),
    [creatorDescription, setCreatorDescription] = useState(""),
    [rights, setRights] = useState(false),
    [licenseAccepted, setLicenseAccepted] = useState(false),
    [filterOpen, setFilterOpen] = useState(false),
    [freeOnly, setFreeOnly] = useState(false),
    [reference, setReference] = useState<string | null>(null),
    [purchaseLicense, setPurchaseLicense] = useState<PurchaseRecord | null>(
      null,
    );
  const idempotency = useRef<string | null>(null),
    searchRef = useRef<HTMLInputElement>(null);
  const refresh = useCallback(async () => {
    try {
      const data = await api("state");
      setAccount(data.account);
      setRegistry(data.models);
      setCreditPackages(data.packages);
      setCatalog(data.characters || defaultCharacters);
      setLoadError("");
      return data.account as Account;
    } catch (e) {
      if ([401, 403].includes((e as Error & { status?: number }).status || 0))
        setAccount(emptyAccount);
      if ((e as Error & { status?: number }).status === 401) {
        window.location.replace(
          "/login?returnTo=" +
            encodeURIComponent(
              safeWorkspaceReturnTo(location.pathname + location.search),
            ),
        );
      }
      setLoadError((e as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
    const path = location.pathname.slice(1).split("/")[0];
    if (path in titles) setPage(path as Page);
    const pop = () => {
      setQuery("");
      setActiveProject(null);
      setSelected(new URLSearchParams(location.search).get("character") || "");
      const p = location.pathname.slice(1).split("/")[0];
      setPage(p in titles ? (p as Page) : "dashboard");
    };
    window.addEventListener("popstate", pop);
    const restore = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setAccount(emptyAccount);
        setLoading(true);
        refresh();
      }
    };
    window.addEventListener("pageshow", restore);
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("popstate", pop);
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("keydown", key);
    };
  }, [refresh]);
  useEffect(() => {
    if (
      account.generations.some((g) =>
        ["queued", "processing"].includes(g.status),
      )
    ) {
      const t = setInterval(refresh, 2000);
      return () => clearInterval(t);
    }
  }, [account.generations, refresh]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30000);
    return () => clearInterval(timer);
  }, [refresh]);
  useEffect(() => {
    if (page === "settings" && !loading) {
      setProfileName(account.name);
      setPrivateDefault(account.defaultPrivate);
    }
  }, [page, loading]);
  const navigate = useCallback((p: Page) => {
    setPage(p);
    setQuery("");
    setActiveProject(null);
    history.pushState({}, "", "/" + p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        navigate("studio");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);
  useEffect(() => {
    const ctx = (document as any).modelContext;
    if (!ctx?.registerTool) return;
    const life = new AbortController();
    Promise.resolve(
      ctx.registerTool(
        {
          name: "model_drops_search_characters",
          description:
            "Search the demo character catalog and show matching characters in the marketplace.",
          inputSchema: {
            type: "object",
            properties: { query: { type: "string" } },
            required: ["query"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute: async (input: any) => {
            if (typeof input.query !== "string" || input.query.length > 200)
              throw new Error("Query must be text under 200 characters");
            navigate("marketplace");
            setQuery(input.query);
            return {
              characters: characters
                .filter((c) =>
                  (c.name + " " + c.tags.join(" "))
                    .toLowerCase()
                    .includes(input.query.toLowerCase()),
                )
                .map((c) => ({ id: c.id, name: c.name })),
            };
          },
        },
        { signal: life.signal },
      ),
    ).catch(() => {});
    return () => life.abort();
  }, [navigate, catalog]);
  const action = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const favorite = async (id: string) => {
    await action(async () => {
      await api("favorite", { characterId: id });
      await refresh();
    });
  };
  const useCharacter = (c: Character) => {
    setSelected(c.id);
    setDetail(null);
    setPrompt(
      `A cinematic portrait of ${c.name}, soft natural light, film grain, rich textures`,
    );
    navigate("studio");
    history.replaceState(
      {},
      "",
      "/studio?character=" + encodeURIComponent(c.id),
    );
  };
  const changeMode = (v: string) => {
    setMode(v);
    if (v === "video" && !["16:9", "9:16"].includes(ratio)) setRatio("16:9");
    setModelId(v === "video" ? "forma-cinema" : "forma-image");
    setResolution(v === "video" ? "720" : "1024");
  };
  const selectedUnavailable =
    !!selected && catalog.some((c) => c.id === selected && c.enabled === false);
  const model =
    registry.find((m) => m.id === modelId) || registry[0] || defaultModels[0];
  const cost =
    model.credits *
    Number(outputs) *
    (resolution === "2048" || resolution === "1080" ? 2 : 1) *
    (mode === "video" ? Number(duration) / 5 : 1);
  useEffect(() => {
    idempotency.current = null;
  }, [
    selected,
    modelId,
    prompt,
    negative,
    ratio,
    resolution,
    outputs,
    seed,
    duration,
    reference,
  ]);
  const generate = () =>
    action(async () => {
      idempotency.current ??= crypto.randomUUID();
      await api("generate", {
        idempotencyKey: idempotency.current,
        characterId: selected || null,
        modelId,
        prompt,
        settings: {
          ratio,
          resolution,
          outputs: Number(outputs),
          negative,
          seed: seed ? Number(seed) : null,
          duration: Number(duration),
        },
        reference,
      });
      idempotency.current = null;
      await refresh();
      toast.success("Demo generation queued. You can leave this page.");
    });
  const purchase = (c: Character) =>
    action(async () => {
      await api("claim", {
        characterId: c.id,
        acceptedLicense: licenseAccepted,
      });
      await refresh();
      toast.success(`${c.name} is ready in your dashboard`);
      setLicenseAccepted(false);
      setDetail(null);
      navigate("dashboard");
    });
  const remix = (g: Generation) => {
    setPrompt(g.prompt);
    setSelected(g.characterId || "");
    setModelId(g.modelId);
    setMode(g.type);
    try {
      const s = JSON.parse(g.settings);
      setRatio(s.ratio);
      setResolution(s.resolution);
      setOutputs(String(s.outputs));
      setNegative(s.negative || "");
      setSeed(s.seed === null ? "" : String(s.seed));
      setDuration(String(s.duration || 5));
    } catch {}
    setAsset(null);
    navigate("studio");
  };
  const filtered = characters
    .filter(
      (c) =>
        (category === "All characters" || c.category === category) &&
        (!query ||
          (c.name + " " + c.creator + " " + c.category + " " + c.tags.join(" "))
            .toLowerCase()
            .includes(query.toLowerCase())) &&
        (!freeOnly || c.price === 0) &&
        (page !== "characters" || account.owned.includes(c.id)) &&
        (page !== "favorites" || account.favorites.includes(c.id)),
    )
    .sort((a, b) =>
      sort === "price"
        ? a.price - b.price
        : sort === "name"
          ? a.name.localeCompare(b.name)
          : Number(b.badge === "FEATURED") - Number(a.badge === "FEATURED"),
    );
  const heading = (
    title: string,
    description?: string,
    right?: React.ReactNode,
  ) => (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {right}
    </div>
  );
  const card = (c: Character) => (
    <article className="character-card" key={c.id}>
      <button
        className="character-image"
        onClick={() => {
          setLicenseAccepted(false);
          setDetail(c);
        }}
        style={{ backgroundColor: c.color }}
        aria-label={`View ${c.name}`}
      >
        <img
          src={c.image}
          alt={`${c.name} character preview`}
          style={{ objectPosition: c.position }}
        />
        {c.badge && (
          <span
            className={
              "card-badge " + (c.badge === "FEATURED" ? "featured" : "")
            }
          >
            {c.badge === "FEATURED" && <Sparkles size={11} />} {c.badge}
          </span>
        )}
        <div className="character-image-bottom">
          <span>{c.category}</span>
          <span>
            <Star size={11} fill="currentColor" />
            {c.rating}
          </span>
        </div>
        <div className="card-hover">
          <span>
            Meet {c.name} <ArrowUpRight size={18} />
          </span>
        </div>
      </button>
      <button
        className={
          "favorite " + (account.favorites.includes(c.id) ? "saved" : "")
        }
        onClick={() => favorite(c.id)}
        aria-label={`${account.favorites.includes(c.id) ? "Unfavorite" : "Favorite"} ${c.name}`}
      >
        <Heart
          size={16}
          fill={account.favorites.includes(c.id) ? "currentColor" : "none"}
        />
      </button>
      <div className="character-caption">
        <div>
          <button onClick={() => setDetail(c)} className="character-name">
            {c.name}
            <span className="verified">
              <Check size={9} />
            </span>
          </button>
          <span className="creator-handle">by @{c.creator}</span>
        </div>
        {account.owned.includes(c.id) ? (
          <button className="owned-create" onClick={() => useCharacter(c)}>
            Create <ArrowUpRight size={13} />
          </button>
        ) : (
          <div className="character-price">
            ${c.price}
            <small>sample price</small>
          </div>
        )}
      </div>
    </article>
  );
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "224px" } as React.CSSProperties}
    >
      <Sidebar className="model-drops-sidebar">
        <SidebarHeader>
          <button
            onClick={() => navigate("dashboard")}
            className="brand-button"
            aria-label="Model Drops home"
          >
            <Brand />
          </button>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navigation.map((n) => (
              <NavButton key={n.id} {...n} page={page} navigate={navigate} />
            ))}
          </SidebarMenu>
          <div className="nav-label">YOUR WORKSPACE</div>
          <SidebarMenu>
            {workspace.map((n) => (
              <NavButton key={n.id} {...n} page={page} navigate={navigate} />
            ))}
          </SidebarMenu>
          <div className="nav-divider" />
          <SidebarMenu>
            {account.isAdmin && (
              <NavButton
                id="admin-training"
                label="Training requests"
                icon={ShieldCheck}
                page={page}
                navigate={navigate}
              />
            )}
            <WorkspaceMoreMenu
              isSuperAdmin={!!account.isSuperAdmin}
              isAdmin={account.isAdmin}
              onNavigate={navigate}
            />
          </SidebarMenu>
          <div className="creator-invite">
            <div className="invite-icon">
              <Sparkles size={17} />
            </div>
            <strong>
              Your characters.
              <br />
              Their next story.
            </strong>
            <p>Bring your creations to Model Drops.</p>
            <button onClick={() => navigate("creators")}>
              Become a creator <ArrowUpRight size={14} />
            </button>
          </div>
        </SidebarContent>
        <SidebarFooter>
          <div className="credit-widget">
            <div>
              <span>
                <Zap size={14} /> Your credits
              </span>
              <strong>{loading ? "—" : count(account.balance)}</strong>
            </div>
            <div className="credit-track">
              <span
                style={{ width: Math.min(100, account.balance / 18.4) + "%" }}
              />
            </div>
            <button onClick={() => setModal("credits")}>
              <Plus size={14} /> Buy credits
            </button>
          </div>
          <button
            className="account"
            onClick={() => {
              setProfileName(account.name);
              setPrivateDefault(account.defaultPrivate);
              navigate("settings");
            }}
          >
            <span className="avatar">
              {account.name.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>{account.name}</strong>
              <small>Personal workspace</small>
            </span>
            <Settings2 size={17} />
          </button>
          <form action="/api/auth/signout" method="post">
            <button type="submit" className="sidebar-signout">
              <LogOut size={14} /> Sign out
            </button>
          </form>
        </SidebarFooter>
      </Sidebar>
      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumb">
            <SidebarTrigger className="mobile-trigger" />
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{titles[page]}</strong>
          </div>
          <div className="top-actions">
            <div className="search-field">
              <Search size={15} />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (
                    ![
                      "discover",
                      "marketplace",
                      "characters",
                      "favorites",
                      "explore",
                    ].includes(page)
                  ) {
                    setPage("marketplace");
                    history.pushState({}, "", "/marketplace");
                  }
                }}
                placeholder="Search characters, inspiration…"
                aria-label="Search characters"
              />
              <kbd>⌘ K</kbd>
            </div>
            <button
              className="icon-button"
              aria-label="Help"
              onClick={() => setModal("help")}
            >
              <HelpCircle size={18} />
            </button>
            <button
              className="icon-button notification-button"
              aria-label="Notifications"
              onClick={() => setModal("notifications")}
            >
              <Bell size={18} />
              {account.notifications.some((n) => !n.read) && <i />}
            </button>
            <button
              className="avatar small"
              aria-label="Account settings"
              onClick={() => {
                setProfileName(account.name);
                navigate("settings");
              }}
            >
              {account.name.slice(0, 1).toUpperCase()}
            </button>
          </div>
        </header>
        <main
          className={"page-content " + (page === "studio" ? "studio-page" : "")}
        >
          {loadError && (
            <div className="error-banner" role="alert">
              {loadError}
              <Button size="sm" onClick={refresh}>
                Retry
              </Button>
            </div>
          )}
          {(page === "train-lora" ||
            page === "my-loras" ||
            page === "admin-training") && (
            <LoraWorkspace
              view={page}
              isAdmin={account.isAdmin}
              onNavigate={navigate}
              onRefresh={() => {
                void refresh();
              }}
            />
          )}
          {page === "dashboard" && (
            <UserDashboard
              name={account.name}
              balance={account.balance}
              owned={account.owned}
              purchases={account.purchases || []}
              generations={account.generations}
              projects={account.projects}
              loading={loading}
              onCreate={(c, kind) => {
                changeMode(kind);
                useCharacter(c);
              }}
              onBrowse={() => navigate("marketplace")}
              onModels={() => navigate("characters")}
              onTrain={() => navigate("train-lora")}
              onLoras={() => navigate("my-loras")}
              onStudio={() => navigate("studio")}
              onCredits={() => setModal("credits")}
              onLibrary={() => navigate("library")}
              onProjects={() => navigate("projects")}
              onProject={(id) => {
                navigate("library");
                setActiveProject(id);
              }}
              onResume={(id) => {
                const g = account.generations.find((g) => g.id === id);
                if (g) {
                  if (g.status === "completed") remix(g);
                  else navigate("library");
                }
              }}
              onLicense={setPurchaseLicense}
            />
          )}
          {page === "discover" && (
            <>
              <div className="page-intro">
                <div>
                  <p className="eyebrow">
                    A LITTLE IMAGINATION. ENDLESS POSSIBILITIES.
                  </p>
                  <h1>What will you create today?</h1>
                </div>
                <span className="demo-pill">
                  <span /> Interactive preview
                </span>
              </div>
              <section className="hero">
                <img
                  className="hero-image"
                  src="/assets/hero.png"
                  alt="Original silver-haired character in a cinematic alien landscape"
                />
                <div className="hero-scrim" />
                <div className="hero-content">
                  <span className="hero-kicker">
                    <span className="mini-line" /> YOUR NEXT STORY STARTS HERE
                  </span>
                  <h2>
                    A character.
                    <br />A thousand
                    <br />
                    <em>possibilities.</em>
                  </h2>
                  <p>
                    Find your character. Make it yours.
                    <br />
                    Bring every idea to life in one studio.
                  </p>
                  <div className="hero-actions">
                    <Button
                      className="lime-button"
                      onClick={() => navigate("marketplace")}
                    >
                      Explore characters <ArrowUpRight size={17} />
                    </Button>
                    <button
                      className="quiet-button"
                      onClick={() => navigate("studio")}
                    >
                      <Play size={13} fill="currentColor" /> Open the studio
                    </button>
                  </div>
                  <div className="hero-pagination">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
                <button
                  className="hero-character"
                  onClick={() => setDetail(characters[0])}
                >
                  <span className="hero-avatar">
                    <img src="/assets/hero.png" alt="" />
                  </span>
                  <span>
                    <small>MEET YOUR NEXT CHARACTER</small>
                    <strong>
                      Nova <span>by @studio.north</span>
                    </strong>
                  </span>
                  <ArrowUpRight size={19} />
                </button>
                <div className="hero-label">MADE OF IMAGINATION</div>
              </section>
              <div className="quick-tools">
                {[
                  {
                    title: "Create an image",
                    desc: "Turn a thought into a frame",
                    icon: ImageIcon,
                    mode: "image",
                  },
                  {
                    title: "Create a video",
                    desc: "Give your story some motion",
                    icon: Clapperboard,
                    mode: "video",
                  },
                  {
                    title: "Find your character",
                    desc: "A familiar face for every idea",
                    icon: Users,
                    mode: "character",
                  },
                  {
                    title: "Your creative space",
                    desc: "Everything, right where you left it",
                    icon: Folder,
                    mode: "projects",
                  },
                ].map((t) => (
                  <button
                    key={t.title}
                    onClick={() => {
                      if (t.mode === "character") navigate("marketplace");
                      else if (t.mode === "projects") navigate("projects");
                      else {
                        changeMode(t.mode);
                        navigate("studio");
                      }
                    }}
                  >
                    <span className="tool-icon">
                      <t.icon size={21} />
                    </span>
                    <span>
                      <strong>{t.title}</strong>
                      <small>{t.desc}</small>
                    </span>
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              </div>
            </>
          )}
          {["discover", "marketplace", "characters", "favorites"].includes(
            page,
          ) && (
            <section className="market-section">
              {heading(
                page === "discover"
                  ? "Characters with a story to tell"
                  : page === "marketplace"
                    ? "Find your next main character."
                    : titles[page],
                page === "discover"
                  ? "Distinctive faces. Consistent worlds. Ready for your imagination."
                  : page === "marketplace"
                    ? "Discover a character. Make it part of your world."
                    : page === "characters"
                      ? "Your collection, ready for its next chapter."
                      : "A collection of characters that caught your eye.",
                page === "discover" ? (
                  <button
                    className="text-link"
                    onClick={() => navigate("marketplace")}
                  >
                    View marketplace <ArrowRight size={15} />
                  </button>
                ) : (
                  <span className="result-count">
                    {filtered.length} characters
                  </span>
                ),
              )}
              <div className="filter-bar">
                <div className="category-pills">
                  {categories.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      className={c === category ? "active" : ""}
                    >
                      {c === "All characters" && <Layers size={13} />} {c}
                    </button>
                  ))}
                </div>
                <div className="filter-controls">
                  <Select value={sort} onValueChange={setSort}>
                    <SelectTrigger aria-label="Sort characters">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trending">Trending</SelectItem>
                      <SelectItem value="price">Price: low to high</SelectItem>
                      <SelectItem value="name">Name: A–Z</SelectItem>
                    </SelectContent>
                  </Select>
                  <button
                    className={
                      "icon-button bordered " + (filterOpen ? "selected" : "")
                    }
                    onClick={() => setFilterOpen(!filterOpen)}
                    aria-label="Filters"
                  >
                    <SlidersHorizontal size={16} />
                  </button>
                </div>
              </div>
              {filterOpen && (
                <div className="filter-panel">
                  <Switch
                    id="free-only"
                    checked={freeOnly}
                    onCheckedChange={setFreeOnly}
                  />
                  <label htmlFor="free-only">Free characters only</label>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setFreeOnly(false);
                      setCategory("All characters");
                      setQuery("");
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              )}
              {filtered.length ? (
                <div className="character-grid">{filtered.map(card)}</div>
              ) : (
                <Empty
                  icon={Users}
                  title={
                    page === "characters"
                      ? "Your cast is waiting."
                      : "No characters found."
                  }
                  text={
                    page === "characters"
                      ? "Explore the marketplace and add a demo character to begin."
                      : "Try another category or search term."
                  }
                  action="Explore characters"
                  onClick={() => {
                    setQuery("");
                    setCategory("All characters");
                    setFreeOnly(false);
                    navigate("marketplace");
                  }}
                />
              )}
              <p className="artwork-note">
                Preview collection · Sample prices and ratings · Illustrative
                artwork, no likeness or commercial rights offered
              </p>
            </section>
          )}
          {page === "discover" && (
            <section className="inspiration-section">
              {heading(
                "A spark for your next idea",
                "One character. An entirely different world.",
                <button
                  className="text-link"
                  onClick={() => navigate("explore")}
                >
                  Explore inspiration <ArrowRight size={15} />
                </button>,
              )}
              <div className="inspiration-grid">
                <button
                  className="inspiration-card wide"
                  onClick={() => {
                    setPrompt(
                      "A cinematic portrait in a vast alien landscape at dusk, muted olive light, 35mm film",
                    );
                    navigate("studio");
                  }}
                >
                  <img
                    src="/assets/hero.png"
                    alt="Cinematic world building inspiration"
                  />
                  <span className="inspiration-tag">
                    <Film size={12} /> CINEMATIC WORLDS
                  </span>
                  <div>
                    <h3>
                      Some stories are
                      <br />
                      written in light.
                    </h3>
                    <span>
                      Start with a little atmosphere <ArrowUpRight size={17} />
                    </span>
                  </div>
                </button>
                <button
                  className="editorial-promo"
                  onClick={() => navigate("creators")}
                >
                  <span className="eyebrow">FOR THE WORLD BUILDERS</span>
                  <h3>
                    Create a character.
                    <br />
                    Start a movement.
                  </h3>
                  <p>
                    A home for your imagination.
                    <br />
                    An audience for your characters.
                  </p>
                  <span className="circle-arrow">
                    <ArrowUpRight size={25} />
                  </span>
                  <div className="promo-lines" />
                </button>
              </div>
            </section>
          )}
          {page === "studio" && (
            <>
              <div className="studio-heading">
                <div>
                  <p className="eyebrow">CREATE CONTENT</p>
                  <h1>Create an image or video.</h1>
                </div>
                <span className="demo-pill">Demo generation</span>
              </div>
              <Tabs
                value={mode}
                onValueChange={changeMode}
                className="studio-tabs"
              >
                <TabsList>
                  <TabsTrigger value="image">
                    <ImageIcon size={15} /> Image
                  </TabsTrigger>
                  <TabsTrigger value="video">
                    <Video size={15} /> Video
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="studio-layout">
                <div className="studio-controls">
                  <div className="control-group">
                    <label>
                      <span>01</span> Your character{" "}
                      <button onClick={() => navigate("marketplace")}>
                        Browse <ArrowUpRight size={12} />
                      </button>
                    </label>
                    <Select
                      value={selected || "none"}
                      onValueChange={(v) => setSelected(v === "none" ? "" : v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          Start from a prompt
                        </SelectItem>
                        {characters.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                            {account.owned.includes(c.id)
                              ? " · In your library"
                              : " · Preview only"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selected && (
                      <div className="selected-character">
                        <img
                          src={characters.find((c) => c.id === selected)?.image}
                          style={{
                            objectPosition: characters.find(
                              (c) => c.id === selected,
                            )?.position,
                          }}
                          alt="Selected character"
                        />
                        <div>
                          <strong>
                            {characters.find((c) => c.id === selected)?.name}
                          </strong>
                          <span>
                            {account.owned.includes(selected)
                              ? "In your library"
                              : "Add to library to generate"}
                          </span>
                        </div>
                        {account.owned.includes(selected) ? (
                          <ShieldCheck size={18} />
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              setDetail(
                                characters.find((c) => c.id === selected)!,
                              )
                            }
                          >
                            Add
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="control-group">
                    <label>
                      <span>02</span> Generation model
                    </label>
                    <Select value={modelId} onValueChange={setModelId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {registry
                          .filter((m) => m.type === mode && m.enabled)
                          .map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name} · {m.credits} credits
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <small className="field-note">
                      <Zap size={12} /> Simulated provider · No AI API charge
                    </small>
                  </div>
                  <div className="control-group">
                    <label htmlFor="prompt">
                      <span>03</span> Describe your vision{" "}
                      <Sparkles size={14} />
                    </label>
                    <Textarea
                      id="prompt"
                      value={prompt}
                      onChange={(e) => {
                        setPrompt(e.target.value);
                        idempotency.current = null;
                      }}
                      placeholder="A cinematic portrait, golden-hour light spilling through a window…"
                      maxLength={4000}
                      className="prompt-input"
                    />
                    <div className="prompt-footer">
                      <button
                        onClick={() =>
                          setPrompt(
                            prompt
                              ? prompt +
                                  ", carefully composed, natural lighting, cinematic depth of field"
                              : "An atmospheric portrait in a quiet city at dawn, natural light, cinematic depth of field",
                          )
                        }
                      >
                        <Sparkles size={12} /> Enhance prompt
                      </button>
                      <span>{prompt.length}/4000</span>
                    </div>
                  </div>
                  <div className="control-grid">
                    <Field label="Aspect ratio">
                      <Select value={ratio} onValueChange={setRatio}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {model.ratios.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Resolution">
                      <Select value={resolution} onValueChange={setResolution}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {model.resolutions.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                              {mode === "video" ? "p" : " px"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Outputs">
                      <Select value={outputs} onValueChange={setOutputs}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["1", "2", "4"].map((v) => (
                            <SelectItem key={v} value={v}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    {mode === "video" ? (
                      <Field label="Duration">
                        <Select value={duration} onValueChange={setDuration}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 seconds</SelectItem>
                            <SelectItem value="10">10 seconds</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    ) : (
                      <Field label="Seed">
                        <Input
                          type="number"
                          value={seed}
                          onChange={(e) => setSeed(e.target.value)}
                          placeholder="Random"
                        />
                      </Field>
                    )}
                  </div>
                  <button
                    className="advanced-toggle"
                    onClick={() => setAdvanced(!advanced)}
                  >
                    <SlidersHorizontal size={14} /> Advanced controls{" "}
                    <ChevronDown
                      className={advanced ? "rotated" : ""}
                      size={14}
                    />
                  </button>
                  {advanced && (
                    <div className="advanced-panel">
                      <Field label="Negative prompt">
                        <Textarea
                          value={negative}
                          onChange={(e) => setNegative(e.target.value)}
                          placeholder="Describe what to avoid"
                        />
                      </Field>
                      <label className="upload-area">
                        <Upload size={16} />{" "}
                        {reference
                          ? "Reference uploaded"
                          : "Upload reference image"}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file)
                              action(async () => {
                                if (file.size > 8 * 1024 * 1024)
                                  throw new Error(
                                    "Use an image smaller than 8 MB",
                                  );
                                const form = new FormData();
                                form.append("file", file);
                                const r = await fetch("/api/upload", {
                                  method: "POST",
                                  body: form,
                                });
                                const d: any = await r.json();
                                if (!r.ok) throw new Error(d.error);
                                setReference(d.id);
                                toast.success("Private reference uploaded");
                              });
                          }}
                        />
                      </label>
                    </div>
                  )}
                  <div className="cost-summary">
                    <div>
                      <span>Generation cost</span>
                      <strong>
                        <Zap size={14} />
                        {cost} credits
                      </strong>
                    </div>
                    <small>
                      {count(account.balance)} available{" "}
                      <ArrowRight size={10} />{" "}
                      {count(Math.max(0, account.balance - cost))} after
                      generation
                    </small>
                  </div>
                  <Button
                    className="lime-button generate-button"
                    disabled={
                      busy ||
                      !prompt.trim() ||
                      cost > account.balance ||
                      (!!selected && !account.owned.includes(selected)) ||
                      !model.enabled ||
                      selectedUnavailable
                    }
                    onClick={generate}
                  >
                    {busy ? (
                      <LoaderCircle className="spin" size={17} />
                    ) : (
                      <Sparkles size={17} />
                    )}{" "}
                    Generate {mode}
                    <span>
                      <Zap size={13} />
                      {cost}
                    </span>
                  </Button>
                  {(!prompt.trim() ||
                    (!!selected && !account.owned.includes(selected)) ||
                    cost > account.balance ||
                    !model.enabled ||
                    selectedUnavailable) && (
                    <p className="generation-guidance" role="status">
                      {selectedUnavailable
                        ? "This character is currently unavailable. Choose another character."
                        : !!selected && !account.owned.includes(selected)
                          ? "Add this character to your library to continue."
                          : !model.enabled
                            ? "Choose an available generation model."
                            : !prompt.trim()
                              ? "Write a prompt above to enable generation."
                              : "You need more demo credits or fewer outputs to continue."}
                    </p>
                  )}
                  <p className="privacy-note">
                    <Lock size={11} /> Private by default. This is a simulated
                    generation. Results are sample images; video mode returns a
                    storyboard preview.
                  </p>
                </div>
                <div className="studio-canvas">
                  <div className="canvas-top">
                    <span>
                      <PanelTop size={14} /> Preview canvas
                    </span>
                    <span>
                      {mode === "image" ? "IMAGE" : "VIDEO"}{" "}
                      <MoreHorizontal size={17} />
                    </span>
                  </div>
                  {account.generations.length ? (
                    <div className="canvas-results">
                      {account.generations.slice(0, 4).map((g) => (
                        <GenerationCard
                          key={g.id}
                          g={g}
                          onClick={() => setAsset(g)}
                          onCancel={() =>
                            action(async () => {
                              await api("cancel", { id: g.id });
                              await refresh();
                            })
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="canvas-empty">
                      <div className="canvas-mark">
                        <Sparkles size={32} />
                      </div>
                      <h3>
                        Every great story
                        <br />
                        starts with a first frame.
                      </h3>
                      <p>
                        Choose a character, describe your vision,
                        <br />
                        and make something only you could imagine.
                      </p>
                      <div>
                        <span>
                          <ImageIcon size={13} /> Image
                        </span>
                        <span>
                          <Video size={13} /> Video
                        </span>
                        <span>
                          <Users size={13} /> Your character
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="canvas-footer">
                    <ShieldCheck size={13} /> Your character stays yours. Model
                    assets stay protected.
                  </div>
                </div>
              </div>
            </>
          )}
          {page === "library" && (
            <>
              {heading(
                activeProject
                  ? account.projects.find((p) => p.id === activeProject)
                      ?.name || "Project"
                  : "Your creative archive.",
                "Every frame, every experiment, every new beginning.",
                <Button
                  className="lime-button"
                  onClick={() => navigate("studio")}
                >
                  <Plus size={16} /> New creation
                </Button>,
              )}
              <div className="filter-bar">
                <div className="category-pills">
                  {["all", "image", "video"].map((t) => (
                    <button
                      key={t}
                      onClick={() => setLibraryFilter(t)}
                      className={libraryFilter === t ? "active" : ""}
                    >
                      {t === "all"
                        ? "All creations"
                        : t === "image"
                          ? "Images"
                          : "Videos"}
                    </button>
                  ))}
                </div>
                <span className="result-count">Private collection</span>
              </div>
              {account.generations.filter(
                (g) =>
                  (libraryFilter === "all" || g.type === libraryFilter) &&
                  (!activeProject || g.projectId === activeProject),
              ).length ? (
                <div className="generation-grid">
                  {account.generations
                    .filter(
                      (g) =>
                        (libraryFilter === "all" || g.type === libraryFilter) &&
                        (!activeProject || g.projectId === activeProject),
                    )
                    .map((g) => (
                      <GenerationCard
                        key={g.id}
                        g={g}
                        onClick={() => setAsset(g)}
                        onCancel={() =>
                          action(async () => {
                            await api("cancel", { id: g.id });
                            await refresh();
                          })
                        }
                      />
                    ))}
                </div>
              ) : (
                <Empty
                  icon={Images}
                  title="Your next idea belongs here."
                  text="Creations you make in the studio will be saved here privately."
                  action="Open AI Studio"
                  onClick={() => navigate("studio")}
                />
              )}
            </>
          )}
          {page === "projects" && (
            <>
              {heading(
                "A home for every idea.",
                "Keep your characters, prompts, and creations together.",
                <Button
                  className="lime-button"
                  onClick={() => setModal("project")}
                >
                  <Plus size={16} /> New project
                </Button>,
              )}
              {account.projects.length ? (
                <div className="project-grid">
                  {account.projects.map((p, i) => (
                    <button
                      key={p.id}
                      className="project-card"
                      onClick={() => {
                        navigate("library");
                        setActiveProject(p.id);
                      }}
                    >
                      <div className={"project-cover cover-" + (i % 3)}>
                        <Folder size={44} />
                        <ArrowUpRight size={20} />
                      </div>
                      <h3>{p.name}</h3>
                      <p>{p.description || "A new story in the making."}</p>
                      <small>
                        {
                          account.generations.filter(
                            (g) => g.projectId === p.id,
                          ).length
                        }{" "}
                        creations · Private project
                      </small>
                    </button>
                  ))}
                </div>
              ) : (
                <Empty
                  icon={Folder}
                  title="Give your ideas a little space."
                  text="Organize your first campaign, film, or character story."
                  action="Create a project"
                  onClick={() => setModal("project")}
                />
              )}
            </>
          )}
          {page === "explore" && (
            <>
              {heading(
                "Follow your curiosity.",
                "Ideas, characters, and worlds worth getting lost in.",
              )}
              <div className="explore-hero">
                <img
                  src="/assets/hero.png"
                  alt="Nova on a cinematic landscape"
                />
                <div>
                  <p className="eyebrow">THE CHARACTER STUDY · 001</p>
                  <h1>
                    One familiar face.
                    <br />
                    Unfamiliar worlds.
                  </h1>
                  <p>Start with Nova. See where your imagination takes her.</p>
                  <Button
                    className="lime-button"
                    onClick={() => setDetail(characters[0])}
                  >
                    Use this character <ArrowUpRight size={16} />
                  </Button>
                </div>
              </div>
              {heading(
                "Discover the collection",
                "Curated demo artwork. Your private creations stay private.",
              )}
              <div className="character-grid">{filtered.map(card)}</div>
            </>
          )}
          {page === "billing" && (
            <>
              {heading(
                "More room to imagine.",
                "Explore credit packages and your account activity.",
              )}
              <div className="balance-banner">
                <div>
                  <span>YOUR DEMO BALANCE</span>
                  <h1>
                    <Zap size={30} />
                    {count(account.balance)} <small>credits</small>
                  </h1>
                </div>
                <Button
                  className="lime-button"
                  onClick={() => setModal("credits")}
                >
                  Explore credit packages <ArrowUpRight size={16} />
                </Button>
              </div>
              <div className="notice">
                <ShieldCheck size={17} />
                <p>
                  Live payments are not enabled. Demo credits have no monetary
                  value.
                </p>
              </div>
              {heading(
                "Credit activity",
                "An immutable record of your demo balance.",
              )}
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Activity</th>
                      <th>Date</th>
                      <th>Credits</th>
                      <th>Balance after</th>
                    </tr>
                  </thead>
                  <tbody>
                    {account.transactions.map((t) => (
                      <tr key={t.id}>
                        <td>{t.description}</td>
                        <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                        <td className={t.amount > 0 ? "positive" : ""}>
                          {t.amount > 0 ? "+" : ""}
                          {count(t.amount)}
                        </td>
                        <td>{count(t.balanceAfter)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {page === "settings" && (
            <>
              {heading(
                "Make yourself at home.",
                "Your profile, privacy, and workspace preferences.",
              )}
              <section className="settings-panel">
                <h3>Profile</h3>
                <Field label="Display name">
                  <Input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    maxLength={60}
                    placeholder={account.name}
                  />
                </Field>
                <div className="setting-row">
                  <div>
                    <strong>Private generations</strong>
                    <p>Keep new creations visible only to you.</p>
                  </div>
                  <Switch
                    checked={privateDefault}
                    onCheckedChange={setPrivateDefault}
                  />
                </div>
                <p className="field-note">
                  Community publishing is not enabled in this preview. All
                  generations remain private.
                </p>
                <Button
                  className="lime-button"
                  disabled={busy}
                  onClick={() =>
                    action(async () => {
                      await api("settings", {
                        name: profileName || account.name,
                        defaultPrivate: privateDefault,
                      });
                      await refresh();
                      toast.success("Preferences saved");
                    })
                  }
                >
                  Save changes
                </Button>
                <div className="settings-divider" />
                <h3>Account & security</h3>
                <p>
                  Signed in as {account.email}. Your models, credit balance,
                  projects, and creations belong to this account.
                </p>
                <Button variant="secondary" onClick={() => navigate("billing")}>
                  View credit activity <ArrowUpRight size={15} />
                </Button>
                <form action="/api/auth/signout" method="post">
                  <Button type="submit" variant="outline">
                    <LogOut size={16} />
                    Sign out
                  </Button>
                </form>
              </section>
            </>
          )}
          {page === "creators" && (
            <>
              {heading(
                "Your imagination deserves an audience.",
                "Build a character collection. Give creators a new way to tell their stories.",
              )}
              <div className="creator-layout">
                <section className="settings-panel">
                  <span className="eyebrow">CREATOR WORKSPACE</span>
                  <h2>
                    {account.creatorStatus
                      ? "Create your next character."
                      : "Join the next wave of creators."}
                  </h2>
                  <p>
                    Submit an original character concept for review. This
                    preview accepts drafts; selling and payouts require verified
                    production accounts.
                  </p>
                  <Field label="Character name">
                    <Input
                      value={creatorName}
                      onChange={(e) => setCreatorName(e.target.value)}
                      placeholder="Give your character a name"
                      maxLength={80}
                    />
                  </Field>
                  <Field label="Character description">
                    <Textarea
                      value={creatorDescription}
                      onChange={(e) => setCreatorDescription(e.target.value)}
                      placeholder="Tell us what makes your character distinctive, and which assets you own."
                      maxLength={3000}
                    />
                  </Field>
                  <label className="rights-check">
                    <input
                      type="checkbox"
                      checked={rights}
                      onChange={(e) => setRights(e.target.checked)}
                    />
                    I own or have the rights necessary to sell this character
                    and its training assets.
                  </label>
                  <Button
                    className="lime-button"
                    disabled={
                      busy ||
                      !rights ||
                      !creatorName.trim() ||
                      creatorDescription.trim().length < 20
                    }
                    onClick={() =>
                      action(async () => {
                        await api("creator-submit", {
                          name: creatorName,
                          description: creatorDescription,
                          rights,
                        });
                        setCreatorName("");
                        setCreatorDescription("");
                        setRights(false);
                        await refresh();
                        toast.success("Concept submitted for review");
                      })
                    }
                  >
                    Submit for review <ArrowUpRight size={15} />
                  </Button>
                </section>
                <div>
                  <div className="creator-metrics">
                    {[
                      {
                        label: "Character concepts",
                        value: account.listings?.length || 0,
                      },
                      { label: "Confirmed sales", value: 0 },
                      { label: "Available earnings", value: "$0.00" },
                    ].map((m) => (
                      <div key={m.label}>
                        <span>{m.label}</span>
                        <strong>{m.value}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="notice">
                    <Lock size={17} />
                    <p>
                      Payouts become available after identity verification and
                      Stripe Connect onboarding.
                    </p>
                  </div>
                  {account.listings?.map((l) => (
                    <div className="listing-row" key={l.id}>
                      <div>
                        <strong>{l.name}</strong>
                        <p>{l.description}</p>
                      </div>
                      <span className="status-pill">
                        {l.status.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          {page === "admin" &&
            (account.isSuperAdmin ? (
              <SuperAdmin
                onTraining={() => navigate("admin-training")}
                onUpdated={refresh}
              />
            ) : (
              <Empty
                icon={Lock}
                title="Super administrator access required"
                text="This account does not have permission to manage the platform."
              />
            ))}
          <footer className="page-footer">
            <Brand />
            <span>A little imagination goes a long way.</span>
            <button onClick={() => setModal("license")}>
              Terms & licenses
            </button>
            <span className="footer-preview">PREVIEW WORKSPACE</span>
          </footer>
        </main>
      </div>
      <Dialog
        open={!!detail}
        onOpenChange={(v) => {
          if (!v) {
            setDetail(null);
            setLicenseAccepted(false);
          }
        }}
      >
        <DialogContent className="character-dialog">
          {detail && (
            <>
              <div className="detail-image">
                <img
                  src={detail.image}
                  style={{ objectPosition: detail.position }}
                  alt={detail.name}
                />
                <span className="card-badge">{detail.category}</span>
                <div>
                  <span>YOUR NEXT MAIN CHARACTER</span>
                  <h2>{detail.name}</h2>
                </div>
              </div>
              <div className="detail-body">
                <div className="detail-eyebrow">
                  <span>DEMO CHARACTER COLLECTION</span>
                  <button
                    className="icon-button"
                    aria-label="Favorite character"
                    onClick={() => favorite(detail.id)}
                  >
                    <Heart
                      size={18}
                      fill={
                        account.favorites.includes(detail.id)
                          ? "currentColor"
                          : "none"
                      }
                    />
                  </button>
                </div>
                <DialogTitle>
                  {detail.name}
                  <span className="verified">
                    <Check size={11} />
                  </span>
                </DialogTitle>
                <DialogDescription>
                  Created by @{detail.creator}
                </DialogDescription>
                <p>{detail.description}</p>
                <div className="tag-row">
                  {detail.tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
                <div className="detail-stats">
                  <span>
                    <Star size={14} /> {detail.rating}{" "}
                    <small>sample rating</small>
                  </span>
                  <span>
                    <Images size={14} /> {detail.uses}{" "}
                    <small>sample creations</small>
                  </span>
                </div>
                <div className="license-block">
                  <ShieldCheck size={18} />
                  <div>
                    <strong>Protected character access</strong>
                    <p>Create in the studio. Character assets stay private.</p>
                    <button onClick={() => setModal("license")}>
                      Read preview license <ArrowUpRight size={12} />
                    </button>
                  </div>
                </div>
                <div className="detail-purchase">
                  <span>
                    <strong>${detail.price}</strong>
                    <small>Illustrative price · no charge in preview</small>
                  </span>
                  {account.owned.includes(detail.id) ? (
                    <Button
                      className="lime-button"
                      onClick={() => useCharacter(detail)}
                    >
                      Create with {detail.name} <ArrowUpRight size={16} />
                    </Button>
                  ) : (
                    <>
                      <label className="rights-check">
                        <input
                          type="checkbox"
                          checked={licenseAccepted}
                          onChange={(e) => setLicenseAccepted(e.target.checked)}
                        />
                        I accept the{" "}
                        <button onClick={() => setModal("license")}>
                          demo license
                        </button>
                        .
                      </label>
                      <Button
                        className="lime-button"
                        disabled={busy || !licenseAccepted}
                        onClick={() => purchase(detail)}
                      >
                        {busy ? (
                          <LoaderCircle size={16} className="spin" />
                        ) : (
                          <Plus size={16} />
                        )}{" "}
                        Add demo character
                      </Button>
                    </>
                  )}
                </div>
                <button
                  className="report-link"
                  onClick={() =>
                    action(async () => {
                      await api("report", {
                        characterId: detail.id,
                        reason: "IP / likeness review requested",
                      });
                      toast.success("Report saved for moderator review");
                    })
                  }
                >
                  <Flag size={12} /> Report this character
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!modal} onOpenChange={(v) => !v && setModal(null)}>
        <DialogContent
          className={modal === "credits" ? "credits-dialog" : "standard-dialog"}
        >
          <DialogTitle>
            {modal === "credits"
              ? "Make room for more imagination."
              : modal === "project"
                ? "Start a new project."
                : modal === "notifications"
                  ? "Your updates"
                  : modal === "license"
                    ? "Preview license & terms"
                    : "Welcome to Model Drops."}
          </DialogTitle>
          <DialogDescription>
            {modal === "credits"
              ? "Simple packages. More possibilities."
              : modal === "project"
                ? "A dedicated space for your next big idea."
                : modal === "notifications"
                  ? "Your workspace, up to date."
                  : modal === "license"
                    ? "Understand what this demonstration includes."
                    : "Your character marketplace and creative studio."}
          </DialogDescription>
          {modal === "credits" && (
            <>
              <div className="notice">
                <ShieldCheck size={16} />
                <p>
                  Payments are not connected. These packages are previews and no
                  money will be charged.
                </p>
              </div>
              <div className="package-grid">
                {creditPackages.map((p, i) => (
                  <div
                    className={"package " + (i === 1 ? "recommended" : "")}
                    key={p.id}
                  >
                    {i === 1 && <span className="popular">MOST POPULAR</span>}
                    <h3>{p.name}</h3>
                    <strong>
                      ${p.price}
                      <small>one time</small>
                    </strong>
                    <p>
                      <Zap size={15} />
                      {count(p.credits)} credits
                    </p>
                    <Button
                      variant={i === 1 ? "default" : "secondary"}
                      onClick={() =>
                        action(async () => {
                          await api("checkout", { packageId: p.id });
                        })
                      }
                    >
                      Buy {p.name}
                    </Button>
                  </div>
                ))}
              </div>
              <button
                className="text-link"
                onClick={() => {
                  setModal(null);
                  navigate("billing");
                }}
              >
                View balance & credit activity <ArrowRight size={14} />
              </button>
            </>
          )}
          {modal === "project" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                action(async () => {
                  await api("project", {
                    name: projectName,
                    description: projectDescription,
                  });
                  await refresh();
                  setModal(null);
                  setProjectName("");
                  setProjectDescription("");
                  navigate("projects");
                  toast.success("Project created");
                });
              }}
              className="modal-form"
            >
              <Field label="Project name">
                <Input
                  required
                  autoFocus
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  maxLength={100}
                  placeholder="e.g. The midnight collection"
                />
              </Field>
              <Field label="Description (optional)">
                <Textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  maxLength={500}
                  placeholder="What are you imagining?"
                />
              </Field>
              <Button
                className="lime-button"
                type="submit"
                disabled={busy || !projectName.trim()}
              >
                Create project <ArrowRight size={15} />
              </Button>
            </form>
          )}
          {modal === "notifications" && (
            <div className="notification-list">
              {account.notifications.length ? (
                account.notifications.map((n) => (
                  <div key={n.id}>
                    <span className="notification-icon">
                      <Bell size={16} />
                    </span>
                    <p>{n.message}</p>
                    {!n.read && <i />}
                  </div>
                ))
              ) : (
                <p>No updates yet. Your next creation starts the story.</p>
              )}
              <Button
                variant="secondary"
                onClick={() =>
                  action(async () => {
                    await api("notifications-read", {});
                    await refresh();
                  })
                }
              >
                <CheckCheck size={15} /> Mark all as read
              </Button>
            </div>
          )}
          {modal === "license" && (
            <div className="terms-copy">
              <p>{license}</p>
              <h3>Your privacy</h3>
              <p>
                Generations and references are private. Only you and authorized
                platform operators can access them. No public publishing occurs
                in this preview.
              </p>
              <h3>Original work only</h3>
              <p>
                Creator concepts must be original or properly licensed.
                Real-person likenesses require consent and additional review.
                Reports are recorded for review before any production listing
                can launch.
              </p>
              <h3>Preview limitations</h3>
              <p>
                AI output is simulated using sample artwork. Credit transactions
                use demo credits. No payments, commercial licenses, or payouts
                are processed.
              </p>
            </div>
          )}
          {modal === "help" && (
            <div className="help-steps">
              {[
                {
                  n: "01",
                  title: "Find your character",
                  text: "Explore the marketplace. Add a demo character to your library.",
                },
                {
                  n: "02",
                  title: "Make something yours",
                  text: "Choose a character and model, write a prompt, then generate in the studio.",
                },
                {
                  n: "03",
                  title: "Build your world",
                  text: "Save your creations to projects. Remix an idea and keep going.",
                },
              ].map((s) => (
                <div key={s.n}>
                  <span>{s.n}</span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                  </div>
                </div>
              ))}
              <Button
                className="lime-button"
                onClick={() => {
                  setModal(null);
                  navigate("marketplace");
                }}
              >
                Find your first character <ArrowUpRight size={16} />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={!!asset} onOpenChange={(v) => !v && setAsset(null)}>
        <DialogContent className="asset-dialog">
          {asset && (
            <>
              <DialogTitle>
                Your {asset.type === "video" ? "video storyboard" : "creation"}
              </DialogTitle>
              <DialogDescription>
                Simulated output · Private to you
              </DialogDescription>
              {asset.image && (
                <img
                  className="asset-preview"
                  src={asset.image}
                  alt={asset.prompt}
                />
              )}
              <p>{asset.prompt}</p>
              <div className="tag-row">
                <span>{asset.status}</span>
                <span>{asset.cost} credits</span>
                <span>
                  {registry.find((m) => m.id === asset.modelId)?.name}
                </span>
                <span>{new Date(asset.createdAt).toLocaleString()}</span>
              </div>
              <div className="asset-actions">
                <Button className="lime-button" onClick={() => remix(asset)}>
                  <RefreshCw size={15} /> Remix
                </Button>
                {asset.image && (
                  <Button asChild variant="secondary">
                    <a href={`/api/media?id=${asset.id}&download=1`} download>
                      <Download size={15} /> Download sample
                    </a>
                  </Button>
                )}
                <Select
                  value={asset.projectId || "none"}
                  onValueChange={(v) =>
                    action(async () => {
                      await api("move", {
                        id: asset.id,
                        projectId: v === "none" ? null : v,
                      });
                      setAsset({
                        ...asset,
                        projectId: v === "none" ? undefined : v,
                      });
                      await refresh();
                      toast.success("Project updated");
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Move to project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {account.projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!purchaseLicense}
        onOpenChange={(open) => {
          if (!open) setPurchaseLicense(null);
        }}
      >
        <DialogContent className="standard-dialog">
          <DialogTitle>Your character license</DialogTitle>
          <DialogDescription>
            {
              characters.find((c) => c.id === purchaseLicense?.characterId)
                ?.name
            }{" "}
            · Saved with your acquisition
          </DialogDescription>
          {purchaseLicense && (
            <div className="terms-copy">
              <p>{purchaseLicense.licenseSnapshot}</p>
              <div className="license-receipt">
                <span>Acquired</span>
                <strong>
                  {new Date(purchaseLicense.purchaseDate).toLocaleDateString()}
                </strong>
                <span>License version</span>
                <strong>{purchaseLicense.licenseVersion}</strong>
                <span>Paid</span>
                <strong>
                  {purchaseLicense.priceCents === 0
                    ? "Free demo access"
                    : `$${(purchaseLicense.priceCents / 100).toFixed(2)}`}
                </strong>
              </div>
              <p>
                This is the license saved for your account. Later listing
                changes do not rewrite it.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Toaster theme="light" position="bottom-right" richColors />
    </SidebarProvider>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}
function Empty({
  icon: Icon,
  title,
  text,
  action,
  onClick,
}: {
  icon: any;
  title: string;
  text: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="empty-state">
      <span>
        <Icon size={28} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <Button className="lime-button" onClick={onClick}>
          {action}
          <ArrowUpRight size={15} />
        </Button>
      )}
    </div>
  );
}
function GenerationCard({
  g,
  onClick,
  onCancel,
}: {
  g: Generation;
  onClick: () => void;
  onCancel: () => void;
}) {
  return (
    <article className="generation-card">
      <button className="generation-preview" onClick={onClick}>
        {g.image ? (
          <img src={g.image} alt={g.prompt} />
        ) : (
          <div className="generation-placeholder">
            {["queued", "processing"].includes(g.status) ? (
              <LoaderCircle size={30} className="spin" />
            ) : (
              <ImageIcon size={30} />
            )}
            <span>{g.status}</span>
          </div>
        )}
        <span className="generation-type">
          {g.type === "video" ? <Video size={12} /> : <ImageIcon size={12} />}{" "}
          DEMO
        </span>
      </button>
      <div>
        <p>{g.prompt}</p>
        <span>
          {g.status} · {g.cost} credits
          {["cancelled", "failed", "refunded"].includes(g.status)
            ? " returned"
            : ""}
        </span>
        {["queued", "processing"].includes(g.status) && (
          <button onClick={onCancel}>Cancel</button>
        )}
      </div>
    </article>
  );
}
