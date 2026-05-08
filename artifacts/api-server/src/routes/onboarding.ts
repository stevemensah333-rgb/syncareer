import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { createClient } from "@supabase/supabase-js";
import { v5 as uuidv5, validate as uuidValidate } from "uuid";

const router: IRouter = Router();

const SUPABASE_URL = process.env["VITE_SUPABASE_URL"] ?? process.env["SUPABASE_URL"];
const SUPABASE_SERVICE_ROLE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"];

const SYNCAREER_CLERK_NAMESPACE = "7b9c5e8a-3f2d-4c1b-a8e6-1d5f7a9c2b4e";

function clerkIdToSupabaseId(clerkId: string): string {
  if (uuidValidate(clerkId)) return clerkId;
  return uuidv5(clerkId, SYNCAREER_CLERK_NAMESPACE);
}

const supabaseAdmin =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

const ALLOWED_USER_TYPES = new Set(["student", "employer", "career_counsellor"]);

function asTrimmedString(value: unknown, max = 200): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function asYear(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseInt(String(value), 10);
  if (!Number.isFinite(n) || n < 1900 || n > 2100) return null;
  return n;
}

router.post("/onboarding", async (req, res) => {
  if (!supabaseAdmin) {
    res.status(500).json({
      error: "Server is not configured for onboarding writes (missing SUPABASE_SERVICE_ROLE_KEY).",
    });
    return;
  }

  const { userId: clerkUserId } = getAuth(req);
  if (!clerkUserId) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const userType = typeof body["userType"] === "string" ? (body["userType"] as string) : "";
  if (!ALLOWED_USER_TYPES.has(userType)) {
    res.status(400).json({ error: "Invalid userType." });
    return;
  }

  const userId = clerkIdToSupabaseId(clerkUserId);
  const details = body["details"] as Record<string, unknown> | undefined;

  // Step 1: validate role-specific input up front so we never write a
  // partial profile (e.g. user_type set, details missing).
  let detailsUpsert: () => Promise<{ error: { message: string } | null }>;
  if (userType === "student") {
    const major = asTrimmedString(details?.["major"]);
    const degreeType = asTrimmedString(details?.["degreeType"], 100);
    if (!major || !degreeType) {
      res.status(400).json({ error: "Major and degree type are required." });
      return;
    }
    detailsUpsert = async () =>
      await supabaseAdmin
        .from("student_details")
        .upsert(
          {
            user_id: userId,
            year_of_admission: asYear(details?.["yearOfAdmission"]),
            expected_completion: asYear(details?.["expectedCompletion"]),
            major,
            school: asTrimmedString(details?.["school"]),
            degree_type: degreeType,
          },
          { onConflict: "user_id" },
        );
  } else if (userType === "employer") {
    const companyName = asTrimmedString(details?.["companyName"]);
    if (!companyName) {
      res.status(400).json({ error: "Company name is required." });
      return;
    }
    detailsUpsert = async () =>
      await supabaseAdmin
        .from("employer_details")
        .upsert(
          {
            user_id: userId,
            company_name: companyName,
            company_location: asTrimmedString(details?.["companyLocation"]),
            industry: asTrimmedString(details?.["industry"], 100),
            company_size: asTrimmedString(details?.["companySize"], 100),
            job_title: asTrimmedString(details?.["jobTitle"], 100),
          },
          { onConflict: "user_id" },
        );
  } else {
    // career_counsellor
    const fullName = asTrimmedString(details?.["fullName"], 100);
    const countryCode = asTrimmedString(details?.["countryCode"], 10);
    const phoneNumber = asTrimmedString(details?.["phoneNumber"], 20);
    if (!fullName || !countryCode || !phoneNumber) {
      res.status(400).json({ error: "Full name, country code and phone number are required." });
      return;
    }
    detailsUpsert = async () =>
      await supabaseAdmin
        .from("counsellor_details")
        .upsert(
          {
            user_id: userId,
            full_name: fullName,
            country_code: countryCode,
            phone_number: phoneNumber,
          },
          { onConflict: "user_id" },
        );
  }

  // Step 2: ensure a profile row exists with the user_type set, but do
  // NOT mark onboarding_completed yet — that flag is only flipped once
  // the role-specific details have been written successfully, so a
  // failure mid-way doesn't leave the user "completed" with no details.
  const profilePrep = { id: userId, user_type: userType };
  const profilePrepResult = await supabaseAdmin
    .from("profiles")
    .upsert(profilePrep, { onConflict: "id" });
  if (profilePrepResult.error) {
    req.log?.error(
      { err: profilePrepResult.error },
      "Onboarding: profile (prep) upsert failed",
    );
    res.status(500).json({ error: profilePrepResult.error.message });
    return;
  }

  // Step 3: write role-specific details.
  const detailsResult = await detailsUpsert();
  if (detailsResult.error) {
    req.log?.error(
      { err: detailsResult.error, userType },
      "Onboarding: role-specific details upsert failed",
    );
    res.status(500).json({ error: detailsResult.error.message });
    return;
  }

  // Step 4: only now flip onboarding_completed (and reset tour_completed
  // for the post-onboarding tour). Retry without tour_completed if that
  // column hasn't been migrated yet in the target Supabase project.
  const completion = {
    id: userId,
    user_type: userType,
    onboarding_completed: true,
  };
  let completionResult = await supabaseAdmin
    .from("profiles")
    .upsert({ ...completion, tour_completed: false }, { onConflict: "id" });
  if (completionResult.error) {
    completionResult = await supabaseAdmin
      .from("profiles")
      .upsert(completion, { onConflict: "id" });
  }
  if (completionResult.error) {
    req.log?.error(
      { err: completionResult.error },
      "Onboarding: profile (completion) upsert failed",
    );
    res.status(500).json({ error: completionResult.error.message });
    return;
  }

  res.json({ ok: true, userId, userType });
});

export default router;
