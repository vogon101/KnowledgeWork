import { NextRequest, NextResponse } from "next/server";
import { getDiaryEntries, getProjects, getMeetings } from "@/lib/knowledge-base";
import { searchTasks, isTaskDbAvailable, getTaskById, type Task } from "@/lib/task-db";

interface SearchResult {
  type: "diary" | "project" | "meeting" | "task" | "person" | "organization" | "workstream" | "file";
  title: string;
  href: string;
  snippet?: string;
  date?: string;
  org?: string;
  matchType: "title" | "content" | "field";
  matchField?: string;
  score: number;
  // Task-specific fields
  taskId?: string;
  taskStatus?: string;
  taskOwner?: string;
  taskPriority?: number;
  // Person-specific fields
  personOrg?: string;
  personEmail?: string;
  // Organization-specific fields
  orgSlug?: string;
  orgShortName?: string;
  // Workstream/Project-specific fields
  projectSlug?: string;
  projectOrg?: string;
  // File-specific fields
  filePath?: string;
  fileExtension?: string;
}

// Parse field-specific queries like "attendee:John" or "tag:nuclear"
function parseQuery(rawQuery: string): { field?: string; value: string } {
  const colonIndex = rawQuery.indexOf(":");
  if (colonIndex > 0) {
    const field = rawQuery.slice(0, colonIndex).toLowerCase().trim();
    const value = rawQuery.slice(colonIndex + 1).toLowerCase().trim();
    // Valid field types
    const validFields = ["attendee", "attendees", "location", "tag", "tags", "project", "owner", "status", "org", "organization", "workstream", "person"];
    if (validFields.includes(field) && value) {
      // Normalize field names
      const normalizedField = field === "attendees" ? "attendee" : field === "tags" ? "tag" : field;
      return { field: normalizedField, value };
    }
  }
  return { value: rawQuery.toLowerCase().trim() };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawQuery = searchParams.get("q")?.trim() || "";

  if (!rawQuery || rawQuery.length < 2) {
    return NextResponse.json({ results: [], query: "" });
  }

  const { field, value: query } = parseQuery(rawQuery);
  const results: SearchResult[] = [];

  try {
    // Check for T-<N> task ID pattern (e.g., "T-123", "t-45")
    const taskIdMatch = rawQuery.match(/^[Tt]-?(\d+)$/);
    if (taskIdMatch && isTaskDbAvailable()) {
      const taskId = parseInt(taskIdMatch[1], 10);
      const task = getTaskById(taskId);

      if (task) {
        return NextResponse.json({
          results: [{
            type: "task" as const,
            title: task.title,
            href: `/tasks/${task.id}`,
            snippet: task.description?.slice(0, 120) || (task.projectName ? `Project: ${task.projectName}` : undefined),
            org: task.projectOrg || undefined,
            matchType: "field" as const,
            matchField: "id",
            score: 1000, // Highest score for exact ID match
            taskId: `T-${task.id}`,
            taskStatus: task.status,
            taskOwner: task.ownerName || undefined,
            taskPriority: task.priority || undefined,
          }],
          total: 1,
          query: rawQuery,
          field: "id",
        });
      }
    }

    // Search diary entries (only for general queries, not field-specific)
    if (!field || field === "tag") {
      const diaryEntries = await getDiaryEntries();
      for (const entry of diaryEntries.slice(0, 100)) {
        const dateStr = entry.date.toLocaleDateString("en-GB", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        });
        const contentLower = entry.content.toLowerCase();
        const summaryLower = (entry.sections.summary || "").toLowerCase();

        let score = 0;
        let matchType: "title" | "content" | "field" = "content";

        if (!field) {
          // General search
          if (dateStr.toLowerCase().includes(query)) {
            score += 50;
            matchType = "title";
          }
          if (summaryLower.includes(query)) {
            score += 40;
          }
          const contentMatches = (contentLower.match(new RegExp(escapeRegex(query), "g")) || []).length;
          score += Math.min(contentMatches * 3, 30);
        }

        // Recency bonus
        const daysSince = Math.floor((Date.now() - entry.date.getTime()) / (1000 * 60 * 60 * 24));
        if (score > 0) {
          if (daysSince < 7) score += 15;
          else if (daysSince < 30) score += 10;
          else if (daysSince < 90) score += 5;

          results.push({
            type: "diary",
            title: dateStr,
            href: `/diary/${entry.year}/${entry.month}/${entry.day}`,
            snippet: getSnippet(entry.content, query, 120),
            date: entry.date.toISOString().slice(0, 10),
            matchType,
            score,
          });
        }
      }
    }

    // Search projects
    if (!field || field === "project" || field === "org" || field === "status" || field === "tag") {
      const projects = await getProjects();
      for (const project of projects) {
        const nameLower = project.name.toLowerCase();
        const contentLower = project.content.toLowerCase();

        let score = 0;
        let matchType: "title" | "content" | "field" = "content";
        let matchField: string | undefined;

        if (field === "project") {
          // Search by project name
          if (nameLower.includes(query)) {
            score = 100;
            matchType = "field";
            matchField = "project";
          }
        } else if (field === "org") {
          if (project.org.toLowerCase().includes(query)) {
            score = 100;
            matchType = "field";
            matchField = "org";
          }
        } else if (field === "status") {
          if (project.frontmatter.status?.toLowerCase() === query) {
            score = 100;
            matchType = "field";
            matchField = "status";
          }
        } else if (field === "tag") {
          const tags = project.frontmatter.tags || [];
          if (tags.some(t => t.toLowerCase().includes(query))) {
            score = 100;
            matchType = "field";
            matchField = "tag";
          }
        } else {
          // General search
          if (nameLower.includes(query)) {
            score += 80;
            matchType = "title";
            if (nameLower === query) score += 30;
            if (nameLower.startsWith(query)) score += 15;
          }
          const contentMatches = (contentLower.match(new RegExp(escapeRegex(query), "g")) || []).length;
          score += Math.min(contentMatches * 3, 30);

          if (project.frontmatter.priority === 1) score += 15;
          else if (project.frontmatter.priority === 2) score += 10;
          if (project.frontmatter.status === "active") score += 10;
        }

        if (score > 0) {
          // Build correct href - workstreams need parent slug in path
          const projectPath = project.isWorkstream && project.parentSlug
            ? `${project.parentSlug}/${project.slug}`
            : project.slug;

          results.push({
            type: project.isWorkstream ? "workstream" : "project",
            title: project.name,
            href: `/projects/${project.org}/${projectPath}`,
            snippet: getSnippet(project.content, query, 120),
            org: project.org,
            matchType,
            matchField,
            score,
            projectSlug: project.parentSlug || project.slug,
            projectOrg: project.org,
          });
        }
      }
    }

    // Search meetings
    const meetings = await getMeetings();
    for (const meeting of meetings.slice(0, 200)) {
      const titleLower = meeting.frontmatter.title.toLowerCase();
      const contentLower = meeting.content.toLowerCase();
      const summaryLower = (meeting.sections.summary || "").toLowerCase();
      const attendees = meeting.frontmatter.attendees || [];
      const location = meeting.frontmatter.location || "";
      const tags = meeting.frontmatter.tags || [];
      const actionOwners = meeting.actions.map(a => a.owner);

      let score = 0;
      let matchType: "title" | "content" | "field" = "content";
      let matchField: string | undefined;

      if (field === "attendee") {
        // Search by attendee
        if (attendees.some(a => a.toLowerCase().includes(query))) {
          score = 100;
          matchType = "field";
          matchField = "attendee";
        }
      } else if (field === "location") {
        if (location.toLowerCase().includes(query)) {
          score = 100;
          matchType = "field";
          matchField = "location";
        }
      } else if (field === "tag") {
        if (tags.some(t => t.toLowerCase().includes(query))) {
          score = 100;
          matchType = "field";
          matchField = "tag";
        }
      } else if (field === "owner") {
        if (actionOwners.some(o => o.toLowerCase().includes(query))) {
          score = 100;
          matchType = "field";
          matchField = "owner";
        }
      } else if (field === "project") {
        if (meeting.frontmatter.project?.toLowerCase().includes(query)) {
          score = 100;
          matchType = "field";
          matchField = "project";
        }
      } else if (field === "org") {
        if (meeting.org.toLowerCase().includes(query)) {
          score = 100;
          matchType = "field";
          matchField = "org";
        }
      } else if (!field) {
        // General search - also search attendees and content
        if (titleLower.includes(query)) {
          score += 70;
          matchType = "title";
        }
        if (summaryLower.includes(query)) {
          score += 35;
        }
        // Also match on attendees for general search
        if (attendees.some(a => a.toLowerCase().includes(query))) {
          score += 50;
        }
        // Match on location
        if (location.toLowerCase().includes(query)) {
          score += 30;
        }
        // Match on tags
        if (tags.some(t => t.toLowerCase().includes(query))) {
          score += 40;
        }
        const contentMatches = (contentLower.match(new RegExp(escapeRegex(query), "g")) || []).length;
        score += Math.min(contentMatches * 3, 30);
      }

      // Recency bonus
      if (score > 0) {
        const meetingDate = new Date(meeting.frontmatter.date);
        const daysSince = Math.floor((Date.now() - meetingDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince < 7) score += 15;
        else if (daysSince < 30) score += 10;
        else if (daysSince < 90) score += 5;

        results.push({
          type: "meeting",
          title: meeting.frontmatter.title,
          href: `/meetings/${meeting.org}/${meeting.frontmatter.date.slice(0, 4)}/${meeting.frontmatter.date.slice(5, 7)}/${meeting.slug}`,
          snippet: field ? `${matchField}: ${query}` : getSnippet(meeting.content, query, 120),
          date: meeting.frontmatter.date,
          org: meeting.org,
          matchType,
          matchField,
          score,
        });
      }
    }

    // Search tasks
    if (isTaskDbAvailable()) {
      const taskSearchOptions: {
        limit?: number;
        includeCompleted?: boolean;
        owner?: string;
        project?: string;
        status?: string;
      } = { limit: 30, includeCompleted: field === "status" };

      // Handle field-specific task searches
      if (field === "owner") {
        taskSearchOptions.owner = query;
      } else if (field === "project") {
        taskSearchOptions.project = query;
      } else if (field === "status") {
        taskSearchOptions.status = query;
      }

      const tasks = searchTasks(
        !field || !["owner", "project", "status"].includes(field) ? query : "",
        taskSearchOptions
      );

      for (const task of tasks) {
        let score = 0;
        let matchType: "title" | "content" | "field" = "content";
        let matchField: string | undefined;

        const titleLower = task.title.toLowerCase();
        const descLower = (task.description || "").toLowerCase();

        if (field === "owner") {
          if (task.ownerName?.toLowerCase().includes(query)) {
            score = 100;
            matchType = "field";
            matchField = "owner";
          }
        } else if (field === "project") {
          if (task.projectSlug?.toLowerCase().includes(query) || task.projectName?.toLowerCase().includes(query)) {
            score = 100;
            matchType = "field";
            matchField = "project";
          }
        } else if (field === "status") {
          if (task.status === query) {
            score = 100;
            matchType = "field";
            matchField = "status";
          }
        } else {
          // General search
          if (titleLower.includes(query)) {
            score += 80;
            matchType = "title";
            if (titleLower === query) score += 30;
            if (titleLower.startsWith(query)) score += 15;
          }
          if (descLower.includes(query)) {
            score += 30;
          }

          // Priority bonus
          if (task.priority === 1) score += 15;
          else if (task.priority === 2) score += 10;

          // Status bonus (active tasks more relevant)
          if (task.status === "in_progress") score += 10;
          else if (task.status === "pending") score += 5;
        }

        if (score > 0) {
          results.push({
            type: "task",
            title: task.title,
            href: `/tasks/${task.id}`,
            snippet: task.description?.slice(0, 120) || (task.projectName ? `Project: ${task.projectName}` : undefined),
            org: task.projectOrg || undefined,
            matchType,
            matchField,
            score,
            taskId: `T-${task.id}`,
            taskStatus: task.status,
            taskOwner: task.ownerName || undefined,
            taskPriority: task.priority || undefined,
          });
        }
      }
    }

    // Search people
    if (!field || field === "person" || field === "org") {
      try {
        const peopleResponse = await fetch(
          `http://localhost:3004/api/trpc/people.list?input=${encodeURIComponent(JSON.stringify({ json: {} }))}`,
          { cache: "no-store" }
        );
        if (peopleResponse.ok) {
          const peopleData = await peopleResponse.json();
          const people = peopleData.result?.data?.json?.people || [];

          for (const person of people) {
            const nameLower = (person.name || "").toLowerCase();
            const emailLower = (person.email || "").toLowerCase();
            const orgLower = (person.org || "").toLowerCase();
            const notesLower = (person.notes || "").toLowerCase();

            let score = 0;
            let matchType: "title" | "content" | "field" = "content";
            let matchField: string | undefined;

            if (field === "person") {
              if (nameLower.includes(query)) {
                score = 100;
                matchType = "field";
                matchField = "person";
              }
            } else if (field === "org") {
              if (orgLower.includes(query)) {
                score = 100;
                matchType = "field";
                matchField = "org";
              }
            } else {
              // General search
              if (nameLower.includes(query)) {
                score += 90;
                matchType = "title";
                if (nameLower === query) score += 30;
                if (nameLower.startsWith(query)) score += 15;
              }
              if (emailLower.includes(query)) {
                score += 50;
              }
              if (orgLower.includes(query)) {
                score += 30;
              }
              if (notesLower.includes(query)) {
                score += 20;
              }
            }

            if (score > 0) {
              results.push({
                type: "person",
                title: person.name,
                href: `/people/${person.id}`,
                snippet: person.role || person.email || undefined,
                org: person.org || undefined,
                matchType,
                matchField,
                score,
                personOrg: person.org || undefined,
                personEmail: person.email || undefined,
              });
            }
          }
        }
      } catch (error) {
        console.error("People search error:", error);
      }
    }

    // Search organizations
    if (!field || field === "org" || field === "organization") {
      try {
        const orgsResponse = await fetch(
          `http://localhost:3004/api/trpc/organizations.list?input=${encodeURIComponent(JSON.stringify({ json: {} }))}`,
          { cache: "no-store" }
        );
        if (orgsResponse.ok) {
          const orgsData = await orgsResponse.json();
          const organizations = orgsData.result?.data?.json?.organizations || [];

          for (const org of organizations) {
            const nameLower = (org.name || "").toLowerCase();
            const slugLower = (org.slug || "").toLowerCase();
            const shortNameLower = (org.shortName || "").toLowerCase();
            const descLower = (org.description || "").toLowerCase();

            let score = 0;
            let matchType: "title" | "content" | "field" = "content";
            let matchField: string | undefined;

            if (field === "org" || field === "organization") {
              if (nameLower.includes(query) || slugLower.includes(query) || shortNameLower.includes(query)) {
                score = 100;
                matchType = "field";
                matchField = "organization";
              }
            } else {
              // General search
              if (nameLower.includes(query)) {
                score += 90;
                matchType = "title";
                if (nameLower === query) score += 30;
                if (nameLower.startsWith(query)) score += 15;
              }
              if (slugLower.includes(query)) {
                score += 70;
              }
              if (shortNameLower.includes(query)) {
                score += 60;
                if (shortNameLower === query) score += 20;
              }
              if (descLower.includes(query)) {
                score += 20;
              }
            }

            if (score > 0) {
              results.push({
                type: "organization",
                title: org.name,
                href: `/projects/${org.slug}`,
                snippet: org.description || undefined,
                matchType,
                matchField,
                score,
                orgSlug: org.slug,
                orgShortName: org.shortName || undefined,
              });
            }
          }
        }
      } catch (error) {
        console.error("Organization search error:", error);
      }
    }

    // Search workstreams (items with itemType='workstream')
    if (!field || field === "workstream" || field === "project") {
      try {
        const wsResponse = await fetch(
          `http://localhost:3004/api/trpc/items.list?input=${encodeURIComponent(JSON.stringify({
            json: {
              itemType: "workstream",
              limit: 100
            }
          }))}`,
          { cache: "no-store" }
        );
        if (wsResponse.ok) {
          const wsData = await wsResponse.json();
          const workstreams = wsData.result?.data?.json?.items || [];

          for (const ws of workstreams) {
            const titleLower = (ws.title || "").toLowerCase();
            const descLower = (ws.description || "").toLowerCase();
            const projectSlugLower = (ws.projectSlug || "").toLowerCase();

            let score = 0;
            let matchType: "title" | "content" | "field" = "content";
            let matchField: string | undefined;

            if (field === "workstream") {
              if (titleLower.includes(query)) {
                score = 100;
                matchType = "field";
                matchField = "workstream";
              }
            } else if (field === "project") {
              if (projectSlugLower.includes(query)) {
                score = 80;
                matchType = "field";
                matchField = "project";
              }
            } else {
              // General search
              if (titleLower.includes(query)) {
                score += 80;
                matchType = "title";
                if (titleLower === query) score += 30;
                if (titleLower.startsWith(query)) score += 15;
              }
              if (descLower.includes(query)) {
                score += 30;
              }
              if (projectSlugLower.includes(query)) {
                score += 20;
              }

              // Status bonus
              if (ws.status === "active") score += 10;
              else if (ws.status === "in_progress") score += 8;
            }

            if (score > 0) {
              // Build href from file_path if available
              // file_path like "example-org/projects/energy/analytics-dashboard.md"
              // should become "/projects/example-org/energy/analytics-dashboard"
              let href = `/tasks/${ws.id}`;
              if (ws.filePath) {
                // Parse: {org}/projects/{path}.md -> /projects/{org}/{path}
                const match = ws.filePath.match(/^([^/]+)\/projects\/(.+)\.md$/);
                if (match) {
                  href = `/projects/${match[1]}/${match[2]}`;
                }
              } else if (ws.sourcePath) {
                // Fallback to source path (parent project README)
                const match = ws.sourcePath.match(/^([^/]+)\/projects\/(.+)\/README\.md$/);
                if (match) {
                  href = `/projects/${match[1]}/${match[2]}`;
                }
              } else if (ws.projectSlug && ws.projectOrg) {
                href = `/projects/${ws.projectOrg}/${ws.projectSlug}`;
              }

              results.push({
                type: "workstream",
                title: ws.title,
                href,
                snippet: ws.description?.slice(0, 120) || (ws.projectName ? `In: ${ws.projectName}` : undefined),
                org: ws.projectOrg || undefined,
                matchType,
                matchField,
                score,
                taskId: ws.displayId,
                taskStatus: ws.status,
                projectSlug: ws.projectSlug || undefined,
                projectOrg: ws.projectOrg || undefined,
              });
            }
          }
        }
      } catch (error) {
        console.error("Workstream search error:", error);
      }
    }

    // Search files by name (general queries only, exclude READMEs and workstreams)
    if (!field) {
      try {
        const filesResponse = await fetch(
          `http://localhost:3004/api/trpc/files.search?input=${encodeURIComponent(JSON.stringify({
            json: {
              query,
              path: "",
              limit: 30
            }
          }))}`,
          { cache: "no-store" }
        );
        if (filesResponse.ok) {
          const filesData = await filesResponse.json();
          const fileResults = filesData.result?.data?.json?.results || [];

          for (const file of fileResults) {
            const fileName = file.entry?.name || "";
            const filePath = file.entry?.path || "";
            const fileNameLower = fileName.toLowerCase();

            // Skip README files (already covered by projects)
            if (fileNameLower === "readme.md") continue;

            // Skip workstream markdown files in projects directories
            // Pattern: {org}/projects/{project}/{workstream}.md (but not README.md)
            const isWorkstreamFile = /^[^/]+\/projects\/[^/]+\/[^/]+\.md$/.test(filePath) && fileNameLower !== "readme.md";
            if (isWorkstreamFile) continue;

            // Use the score from file search, but scale it down slightly
            // since file name matches are less contextual than content matches
            const score = Math.round(file.score * 0.6);

            if (score > 0) {
              // Determine href based on file type
              const extension = file.entry?.extension || "";
              let href = `/files/${filePath}`;

              // For markdown files, check if they're in a viewable location
              if (extension === ".md") {
                // Diary entries: diary/YYYY/MM/DD.md
                const diaryMatch = filePath.match(/^diary\/(\d{4})\/(\d{2})\/(\d{2})\.md$/);
                if (diaryMatch) {
                  href = `/diary/${diaryMatch[1]}/${diaryMatch[2]}/${diaryMatch[3]}`;
                }
                // Meeting notes: {org}/meetings/YYYY/MM/{slug}.md
                const meetingMatch = filePath.match(/^([^/]+)\/meetings\/(\d{4})\/(\d{2})\/([^/]+)\.md$/);
                if (meetingMatch) {
                  href = `/meetings/${meetingMatch[1]}/${meetingMatch[2]}/${meetingMatch[3]}/${meetingMatch[4].replace(/\.md$/, "")}`;
                }
              }

              results.push({
                type: "file",
                title: fileName,
                href,
                snippet: filePath,
                matchType: "title",
                score,
                filePath,
                fileExtension: extension,
              });
            }
          }
        }
      } catch (error) {
        console.error("File search error:", error);
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      results: results.slice(0, 50),
      total: results.length,
      query: rawQuery,
      field,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ results: [], error: "Search failed" }, { status: 500 });
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSnippet(content: string, query: string, length = 120): string {
  const lowerContent = content.toLowerCase();
  const index = lowerContent.indexOf(query);

  if (index === -1) {
    // No direct match, return first meaningful content
    const firstPara = content.replace(/^#.+\n+/, "").trim().split("\n\n")[0];
    return firstPara.slice(0, length).replace(/\n/g, " ").trim() + (firstPara.length > length ? "..." : "");
  }

  const start = Math.max(0, index - 40);
  const end = Math.min(content.length, index + query.length + 80);
  let snippet = content.slice(start, end).trim();

  if (start > 0) snippet = "..." + snippet;
  if (end < content.length) snippet = snippet + "...";

  return snippet.replace(/\n/g, " ");
}
