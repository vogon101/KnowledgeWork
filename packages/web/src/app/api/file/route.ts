import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

// KB_ROOT points to the content directory (contains diary/, projects/, etc.)
const KB_ROOT = process.env.KNOWLEDGE_BASE_PATH || path.join(process.cwd(), "../../content");

// Validate the path is within KB_ROOT and not in dangerous directories
function validatePath(filePath: string): boolean {
  const normalized = path.normalize(filePath);
  const fullPath = path.join(KB_ROOT, normalized);

  // Must be within KB_ROOT
  if (!fullPath.startsWith(KB_ROOT)) {
    return false;
  }

  // Don't allow modifications to certain directories
  const forbidden = [
    "knowledge-work-web",
    ".git",
    "node_modules",
    ".claude",
  ];

  const parts = normalized.split(path.sep);
  if (parts.some((p) => forbidden.includes(p))) {
    return false;
  }

  return true;
}

// GET - Read a file
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const filePath = searchParams.get("path");

  if (!filePath) {
    return NextResponse.json({ error: "Path required" }, { status: 400 });
  }

  if (!validatePath(filePath)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 403 });
  }

  const fullPath = path.join(KB_ROOT, filePath);

  try {
    const content = await fs.readFile(fullPath, "utf-8");
    const { data: frontmatter, content: body } = matter(content);

    return NextResponse.json({
      path: filePath,
      frontmatter,
      content: body,
      raw: content,
    });
  } catch (error) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}

// PUT - Update a file
export async function PUT(request: NextRequest) {
  try {
    const { path: filePath, raw, content, frontmatter } = await request.json();

    if (!filePath) {
      return NextResponse.json({ error: "Path required" }, { status: 400 });
    }

    if (!validatePath(filePath)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 403 });
    }

    const fullPath = path.join(KB_ROOT, filePath);

    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // If raw content provided, save directly
    // Otherwise reconstruct from content + frontmatter
    let fileContent: string;
    if (raw !== undefined) {
      fileContent = raw;
    } else if (frontmatter && Object.keys(frontmatter).length > 0) {
      fileContent = matter.stringify(content || "", frontmatter);
    } else {
      fileContent = content || "";
    }

    await fs.writeFile(fullPath, fileContent, "utf-8");

    return NextResponse.json({ success: true, path: filePath });
  } catch (error) {
    console.error("Save error:", error);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}

// POST - Create a new file
export async function POST(request: NextRequest) {
  try {
    const { path: filePath, content, frontmatter } = await request.json();

    if (!filePath) {
      return NextResponse.json({ error: "Path required" }, { status: 400 });
    }

    if (!validatePath(filePath)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 403 });
    }

    const fullPath = path.join(KB_ROOT, filePath);

    // Check if file already exists
    try {
      await fs.access(fullPath);
      return NextResponse.json({ error: "File already exists" }, { status: 409 });
    } catch {
      // File doesn't exist, good
    }

    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // Construct file with frontmatter
    let fileContent = content || "";
    if (frontmatter && Object.keys(frontmatter).length > 0) {
      fileContent = matter.stringify(content || "", frontmatter);
    }

    await fs.writeFile(fullPath, fileContent, "utf-8");

    return NextResponse.json({ success: true, path: filePath });
  } catch (error) {
    console.error("Create error:", error);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
