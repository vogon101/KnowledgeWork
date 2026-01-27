"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/toast";
import { trpc } from "@/lib/trpc";

interface DeletePersonButtonProps {
  personId: number;
  personName: string;
  taskCount: number;
}

export function DeletePersonButton({ personId, personName, taskCount }: DeletePersonButtonProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  const deleteMutation = trpc.people.delete.useMutation({
    onSuccess: () => {
      showToast(`Deleted ${personName}`, "success");
      router.push("/people");
      router.refresh();
    },
    onError: (error: { message: string }) => {
      showToast(`Failed to delete: ${error.message}`, "error");
      setOpen(false);
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate({ id: personId });
  };

  const loading = deleteMutation.isPending;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 text-[12px] text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors">
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {personName}?</AlertDialogTitle>
          <AlertDialogDescription>
            {taskCount > 0
              ? `This will unassign ${taskCount} task${taskCount !== 1 ? "s" : ""} from this person. This action cannot be undone.`
              : "This action cannot be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-500"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
