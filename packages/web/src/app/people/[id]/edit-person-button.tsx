"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/toast";
import { trpc } from "@/lib/trpc";

interface Person {
  id: number;
  name: string;
  email: string | null;
  org: string | null;
  notes: string | null;
}

interface EditPersonButtonProps {
  person: Person;
}

export function EditPersonButton({ person }: EditPersonButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(person.name);
  const [email, setEmail] = useState(person.email || "");
  const [org, setOrg] = useState(person.org || "");
  const [notes, setNotes] = useState(person.notes || "");
  const router = useRouter();
  const { showToast } = useToast();

  const updateMutation = trpc.people.update.useMutation({
    onSuccess: () => {
      showToast("Person updated", "success");
      setOpen(false);
      router.refresh();
    },
    onError: (error) => {
      showToast(`Failed to update: ${error.message}`, "error");
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      showToast("Name is required", "error");
      return;
    }

    // Validate org value against allowed values
    const validOrgs = ["ya", "cbp", "external", "personal"] as const;
    const orgValue = org.trim().toLowerCase();
    const validOrg = validOrgs.find(v => v === orgValue) || null;

    updateMutation.mutate({
      id: person.id,
      data: {
        name: name.trim(),
        email: email.trim() || null,
        org: validOrg,
        notes: notes.trim() || null,
      },
    });
  };

  const loading = updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-md transition-colors">
          <Pencil className="h-4 w-4" />
          Edit
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Person</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1 block">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-[13px] bg-zinc-800 border border-zinc-700 rounded-md text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1 block">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-[13px] bg-zinc-800 border border-zinc-700 rounded-md text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1 block">
              Organisation
            </label>
            <input
              type="text"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              className="w-full px-3 py-2 text-[13px] bg-zinc-800 border border-zinc-700 rounded-md text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
              placeholder="Company or org"
            />
          </div>
          <div>
            <label className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1 block">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-[13px] bg-zinc-800 border border-zinc-700 rounded-md text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
              placeholder="Optional notes about this person"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-2 text-[13px] text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-[13px] bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-colors disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
