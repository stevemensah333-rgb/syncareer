import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import curated from "./curated.json" with { type: "json" };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface YouTubeItem {
  videoId: string;
  title: string;
  channel: string;
  channelId: string;
  durationSec: number;
  durationLabel: string;
  viewCount: number;
  thumbnailUrl: string;
  url: string;
}

interface CuratedItem {
  title: string;
  provider: string;
  url: string;
  description: string;
}

interface Payload {
  youtube: YouTubeItem[];
  curated: CuratedItem[];
}

// Trusted educational channels — these get a quality boost in ranking.
const PRIORITY_CHANNELS = new Set([
  "freeCodeCamp.org",
  "CS50",
  "Fireship",
  "Traversy Media",
  "The Net Ninja",
  "Khan Academy",
  "MIT OpenCourseWare",
  "TED-Ed",
  "TED",
  "TEDx Talks",
  "HubSpot",
  "HubSpot Marketing",
  "Google Career Certificates",
  "Google for Developers",
  "Coursera",
  "Crash Course",
  "3Blue1Brown",
  "Programming with Mosh",
  "Web Dev Simplified",
  "Academind",
  "Harvard University",
  "Stanford",
  "Microsoft Developer",
]);

const MIN_VIEW_COUNT = 50_000;
const MIN_DURATION_SEC = 5 * 60; // 5 min — skip shorts and clickbait
const MAX_DURATION_SEC = 5 * 60 * 60; // 5h — skip massive playlists rendered as one video
const RESULTS_PER_SKILL = 4;

// ISO 8601 PT#H#M#S → seconds
function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  const h = parseInt(m[1] || "0", 10);
  const min = parseInt(m[2] || "0", 10);
  const s = parseInt(m[3] || "0", 10);
  return h * 3600 + min * 60 + s;
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m} min`;
}

function getCuratedFor(skillName: string): CuratedItem[] {
  const key = skillName.toLowerCase().trim();
  const map = curated as Record<string, CuratedItem[]>;
  if (map[key]) return map[key];
  // Fuzzy: check if any registry key is contained in (or contains) the skill name
  for (const k of Object.keys(map)) {
    if (key.includes(k) || k.includes(key)) return map[k];
  }
  return [];
}

async function searchYouTube(
  apiKey: string,
  query: string,
): Promise<YouTubeItem[]> {
  // 1) search.list — gets candidate videoIds
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("videoEmbeddable", "true");
  searchUrl.searchParams.set("relevanceLanguage", "en");
  searchUrl.searchParams.set("safeSearch", "strict");
  searchUrl.searchParams.set("maxResults", "15");
  searchUrl.searchParams.set("key", apiKey);

  const searchRes = await fetch(searchUrl.toString());
  if (!searchRes.ok) {
    const text = await searchRes.text();
    throw new Error(`YouTube search failed [${searchRes.status}]: ${text}`);
  }
  const searchData = await searchRes.json();
  const videoIds: string[] = (searchData.items || [])
    .map((it: any) => it.id?.videoId)
    .filter(Boolean);
  if (videoIds.length === 0) return [];

  // 2) videos.list — gets stats + duration so we can filter
  const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  detailsUrl.searchParams.set("part", "snippet,contentDetails,statistics");
  detailsUrl.searchParams.set("id", videoIds.join(","));
  detailsUrl.searchParams.set("key", apiKey);

  const detailsRes = await fetch(detailsUrl.toString());
  if (!detailsRes.ok) {
    const text = await detailsRes.text();
    throw new Error(`YouTube videos failed [${detailsRes.status}]: ${text}`);
  }
  const detailsData = await detailsRes.json();

  const items: YouTubeItem[] = (detailsData.items || [])
    .map((v: any) => {
      const durationSec = parseDuration(v.contentDetails?.duration || "");
      const viewCount = parseInt(v.statistics?.viewCount || "0", 10);
      return {
        videoId: v.id,
        title: v.snippet?.title || "",
        channel: v.snippet?.channelTitle || "",
        channelId: v.snippet?.channelId || "",
        durationSec,
        durationLabel: formatDuration(durationSec),
        viewCount,
        thumbnailUrl:
          v.snippet?.thumbnails?.medium?.url ||
          v.snippet?.thumbnails?.default?.url ||
          "",
        url: `https://www.youtube.com/watch?v=${v.id}`,
      };
    })
    .filter(
      (v: YouTubeItem) =>
        v.viewCount >= MIN_VIEW_COUNT &&
        v.durationSec >= MIN_DURATION_SEC &&
        v.durationSec <= MAX_DURATION_SEC,
    );

  // Rank: priority channels first, then by views
  items.sort((a, b) => {
    const aPri = PRIORITY_CHANNELS.has(a.channel) ? 1 : 0;
    const bPri = PRIORITY_CHANNELS.has(b.channel) ? 1 : 0;
    if (aPri !== bPri) return bPri - aPri;
    return b.viewCount - a.viewCount;
  });

  return items.slice(0, RESULTS_PER_SKILL);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const youtubeKey = Deno.env.get("YOUTUBE_API_KEY");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const skillName = (body.skillName || "").toString().trim();
    const careerPath = (body.careerPath || "").toString().trim();

    if (!skillName || !careerPath) {
      return new Response(
        JSON.stringify({ error: "skillName and careerPath are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const adminClient = createClient(supabaseUrl, serviceKey);

    // 1) Cache lookup
    const { data: cached } = await adminClient
      .from("cached_free_resources")
      .select("payload, expires_at")
      .eq("skill_name", skillName)
      .eq("career_path", careerPath)
      .maybeSingle();

    if (cached && new Date(cached.expires_at) > new Date()) {
      return new Response(
        JSON.stringify({ ...cached.payload, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2) Build fresh payload
    const curatedItems = getCuratedFor(skillName);
    let youtubeItems: YouTubeItem[] = [];

    if (youtubeKey) {
      try {
        const query = `${skillName} ${careerPath} tutorial`;
        youtubeItems = await searchYouTube(youtubeKey, query);
      } catch (e) {
        console.error("YouTube search error:", e);
        // Don't fail the whole request — curated items still help
      }
    } else {
      console.warn("YOUTUBE_API_KEY not configured — skipping YouTube search");
    }

    const payload: Payload = { youtube: youtubeItems, curated: curatedItems };

    // 3) Upsert cache (7-day default from table)
    await adminClient
      .from("cached_free_resources")
      .upsert(
        {
          skill_name: skillName,
          career_path: careerPath,
          payload,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: "skill_name,career_path" },
      );

    return new Response(
      JSON.stringify({ ...payload, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("suggest-free-resources error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
