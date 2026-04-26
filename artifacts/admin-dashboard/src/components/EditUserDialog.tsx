import { useEffect, useMemo, useState } from "react";
import { useUpdateUser, type UserProfile } from "@/hooks/use-api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, EyeOff, Plus, Trash2, KeyRound, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const READONLY_FIELDS = new Set(["id", "created_at"]);
const PREFERRED_ORDER = [
  "email",
  "username",
  "full_name",
  "avatar_url",
  "api_key",
  "is_premium",
  "updated_at",
];
const SECRET_FIELDS = new Set(["api_key", "apikey", "token", "secret", "password"]);
const BOOLEAN_FIELDS = new Set(["is_premium", "is_admin", "is_active", "active", "banned"]);

type FieldEntry = {
  key: string;
  value: unknown;
};

function sortFields(entries: FieldEntry[]): FieldEntry[] {
  return [...entries].sort((a, b) => {
    const ai = PREFERRED_ORDER.indexOf(a.key);
    const bi = PREFERRED_ORDER.indexOf(b.key);
    if (ai === -1 && bi === -1) return a.key.localeCompare(b.key);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

function generateApiKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function EditUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: UserProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateUser = useUpdateUser();

  const initialEntries = useMemo<FieldEntry[]>(() => {
    if (!user) return [];
    return sortFields(
      Object.entries(user)
        .filter(([k]) => !READONLY_FIELDS.has(k))
        .map(([key, value]) => ({ key, value })),
    );
  }, [user]);

  const [entries, setEntries] = useState<FieldEntry[]>(initialEntries);
  const [newKey, setNewKey] = useState("");
  const [reveal, setReveal] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open) {
      setEntries(initialEntries);
      setNewKey("");
      setReveal({});
    }
  }, [open, initialEntries]);

  if (!user) return null;

  const updateValue = (key: string, value: unknown) => {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, value } : e)));
  };

  const removeField = (key: string) => {
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, value: null } : e)));
  };

  const addField = () => {
    const k = newKey.trim();
    if (!k) {
      toast.error("Field name is required");
      return;
    }
    if (entries.find((e) => e.key === k) || READONLY_FIELDS.has(k)) {
      toast.error("Field already exists");
      return;
    }
    setEntries((prev) => sortFields([...prev, { key: k, value: "" }]));
    setNewKey("");
  };

  const handleSave = async () => {
    const initialMap = new Map(initialEntries.map((e) => [e.key, e.value]));
    const changed: Record<string, unknown> = {};

    for (const { key, value } of entries) {
      const before = initialMap.get(key);
      if (JSON.stringify(before) !== JSON.stringify(value)) {
        changed[key] = value;
      }
    }

    // New keys not in initial entries
    for (const { key, value } of entries) {
      if (!initialMap.has(key) && value !== "" && value !== null) {
        changed[key] = value;
      }
    }

    if (Object.keys(changed).length === 0) {
      toast.info("No changes to save");
      return;
    }

    try {
      await updateUser.mutateAsync({ user_id: user.id, fields: changed });
      toast.success(`Updated ${Object.keys(changed).length} field(s)`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update user");
    }
  };

  const renderInput = (entry: FieldEntry) => {
    const { key, value } = entry;
    const isSecret = SECRET_FIELDS.has(key.toLowerCase());
    const isBool =
      BOOLEAN_FIELDS.has(key) || typeof value === "boolean";
    const isLong =
      typeof value === "string" && (value.length > 80 || key === "avatar_url");

    if (isBool) {
      return (
        <div className="flex items-center gap-3 h-10">
          <Switch
            checked={!!value}
            onCheckedChange={(v) => updateValue(key, v)}
          />
          <span className="text-xs text-muted-foreground">
            {value ? "true" : "false"}
          </span>
        </div>
      );
    }

    if (isSecret) {
      return (
        <div className="flex gap-1">
          <div className="relative flex-1">
            <Input
              type={reveal[key] ? "text" : "password"}
              value={(value as string) ?? ""}
              onChange={(e) => updateValue(key, e.target.value)}
              className="font-mono pr-9"
              placeholder="(empty)"
            />
            <button
              type="button"
              onClick={() => setReveal((r) => ({ ...r, [key]: !r[key] }))}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={reveal[key] ? "Hide" : "Show"}
            >
              {reveal[key] ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Generate new key"
            onClick={() => {
              updateValue(key, generateApiKey());
              setReveal((r) => ({ ...r, [key]: true }));
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    return (
      <Input
        value={value === null || value === undefined ? "" : String(value)}
        onChange={(e) => updateValue(key, e.target.value)}
        className={isLong ? "font-mono text-xs" : ""}
        placeholder="(empty)"
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Edit User
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {user.id}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="p-6 space-y-4">
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No editable fields available.
              </p>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.key}
                  className="grid grid-cols-[140px_1fr_auto] gap-3 items-start"
                >
                  <Label className="pt-2.5 text-sm font-mono text-muted-foreground truncate">
                    {entry.key}
                  </Label>
                  <div>{renderInput(entry)}</div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-muted-foreground hover:text-destructive"
                    title="Set to null"
                    onClick={() => removeField(entry.key)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}

            <Separator className="my-4" />

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                Add custom field
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addField();
                    }
                  }}
                  placeholder="field_name"
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addField}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t bg-muted/20">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updateUser.isPending}>
            {updateUser.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
