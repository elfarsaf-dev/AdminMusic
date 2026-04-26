import { useState, useEffect } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/components/theme-provider";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Music, LayoutDashboard, Users, Activity, 
  LogOut, Sun, Moon, RefreshCw, Command as CmdIcon, 
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  CommandDialog, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";
import { API_BASE } from "@/lib/api";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const { clearAdminKey } = useAuth();
  const { theme, setTheme } = useTheme();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [cmdOpen, setCmdOpen] = useState(false);
  
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCmdOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleRefresh = async () => {
    await queryClient.invalidateQueries();
    toast.success("Refreshed all data");
  };

  const navItems = [
    { label: "Overview", href: "/", icon: LayoutDashboard },
    { label: "Users", href: "/users", icon: Users },
    { label: "Usage", href: "/usage", icon: Activity },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="p-4 flex items-center gap-2 mb-4">
        <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
          <Music size={20} />
        </div>
        <span className="font-bold text-lg tracking-tight text-sidebar-foreground">Audiops</span>
      </div>
      
      <nav className="flex-1 px-2 space-y-1">
        {navItems.map((item) => {
          const [isActive] = useRoute(item.href === '/' ? '/' : `${item.href}/*`);
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={`w-full justify-start gap-3 ${isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium' : 'text-sidebar-foreground/70'}`}
              >
                <item.icon size={18} />
                {item.label}
              </Button>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-2">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-sidebar-foreground/70"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </Button>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10"
          onClick={clearAdminKey}
        >
          <LogOut size={18} />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 shrink-0">
        <div className="fixed inset-y-0 w-64">
          <SidebarContent />
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-14 border-b bg-card/50 backdrop-blur sticky top-0 z-10 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu size={20} />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <SidebarContent />
              </SheetContent>
            </Sheet>

            <Button 
              variant="outline" 
              size="sm" 
              className="hidden md:flex gap-2 text-muted-foreground h-8"
              onClick={() => setCmdOpen(true)}
            >
              <CmdIcon size={14} />
              <span>Cmd+K</span>
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex text-xs text-muted-foreground items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              {API_BASE.replace('https://', '')}
            </div>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleRefresh}>
                  <RefreshCw size={18} className="text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Data</TooltipContent>
            </Tooltip>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8">
          {children}
        </main>
      </div>

      <CommandDialog open={cmdOpen} onOpenChange={setCmdOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {navItems.map((item) => (
              <CommandItem 
                key={item.href}
                onSelect={() => {
                  setLocation(item.href);
                  setCmdOpen(false);
                }}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => { handleRefresh(); setCmdOpen(false); }}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </CommandItem>
            <CommandItem onSelect={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); setCmdOpen(false); }}>
              {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              Toggle Theme
            </CommandItem>
            <CommandItem onSelect={() => { clearAdminKey(); setCmdOpen(false); }}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
}
