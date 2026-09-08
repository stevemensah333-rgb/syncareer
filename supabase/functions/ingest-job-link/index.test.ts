import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { normalizePosting, validatePostingUrl } from "./posting.ts";

Deno.test("rejects non-public and malformed links", () => {
  assertEquals(validatePostingUrl("").ok, false);
  assertEquals(validatePostingUrl("not a url").ok, false);
  assertEquals(validatePostingUrl("ftp://example.com/job").ok, false);
  assertEquals(validatePostingUrl("http://localhost:8080/job").ok, false);
  assertEquals(validatePostingUrl("http://192.168.1.4/job").ok, false);
  assertEquals(validatePostingUrl("https://jobs.example.com/role/12").ok, true);
});

Deno.test("normalizes extracted fields and drops invented ones", () => {
  const url = new URL("https://www.jobs.example.com/role/12");
  const posting = normalizePosting(
    {
      data: {
        markdown: "# Data analyst\nFull posting text",
        metadata: { title: "Data analyst | Example" },
        json: {
          title: "Data analyst",
          organisation: "Example Ltd",
          application_deadline: "soon",
          skills: ["SQL", "sql", "Python"],
        },
      },
    },
    url,
  );

  assertEquals(posting.title, "Data analyst");
  assertEquals(posting.organisation, "Example Ltd");
  assertEquals(posting.deadline, null);
  assertEquals(posting.skills, ["SQL", "Python"]);
  assertEquals(posting.description, "# Data analyst\nFull posting text");
  assertEquals(posting.sourceHost, "jobs.example.com");
});

Deno.test("falls back to page metadata title and keeps a real deadline", () => {
  const posting = normalizePosting(
    { data: { metadata: { title: "Intern chemist" }, json: { application_deadline: "2026-10-01" } } },
    new URL("https://example.com/j/1"),
  );
  assertEquals(posting.title, "Intern chemist");
  assertEquals(posting.deadline, "2026-10-01");
});
