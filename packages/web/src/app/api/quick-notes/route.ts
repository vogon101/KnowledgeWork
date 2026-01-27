import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const KB_ROOT = process.env.KNOWLEDGE_BASE_PATH || path.join(process.cwd(), "../../content");
const QUICK_NOTES_DIR = path.join(KB_ROOT, "_quick-notes");

// Ensure directory exists
function ensureDir() {
  if (!fs.existsSync(QUICK_NOTES_DIR)) {
    fs.mkdirSync(QUICK_NOTES_DIR, { recursive: true });
  }
}

// GET - List all quick notes
export async function GET() {
  ensureDir();

  try {
    const files = fs.readdirSync(QUICK_NOTES_DIR).filter((f) => f.endsWith(".json"));
    const notes = files.map((file) => {
      const content = fs.readFileSync(path.join(QUICK_NOTES_DIR, file), "utf-8");
      return JSON.parse(content);
    });

    // Sort by creation date, newest first
    notes.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Failed to list quick notes:", error);
    return NextResponse.json({ notes: [] });
  }
}

// POST - Save a quick note
export async function POST(request: NextRequest) {
  ensureDir();

  try {
    const note = await request.json();

    if (!note.id) {
      return NextResponse.json({ error: "Note ID required" }, { status: 400 });
    }

    const filePath = path.join(QUICK_NOTES_DIR, `${note.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(note, null, 2));

    return NextResponse.json({ success: true, note });
  } catch (error) {
    console.error("Failed to save quick note:", error);
    return NextResponse.json(
      { error: "Failed to save note" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a quick note
export async function DELETE(request: NextRequest) {
  ensureDir();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Note ID required" }, { status: 400 });
    }

    const filePath = path.join(QUICK_NOTES_DIR, `${id}.json`);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Failed to delete quick note:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}
