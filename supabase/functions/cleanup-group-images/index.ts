import { createClient } from "npm:@supabase/supabase-js@2";

type CleanupJob = {
  group_id: string;
  image_path_for_cleanup: string;
  image_cleanup_status: "pending" | "failed" | "processing";
  image_cleanup_attempts: number;
};

type StorageCleanupJob = {
  id: string;
  group_id: string;
  bucket_id: "group-images" | "akiba-group-chat-attachments" | "akiba-group-report-evidence";
  object_path: string;
  status: "pending" | "failed" | "processing";
  attempts: number;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase service environment is not configured.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function validImagePath(groupId: string, path: string) {
  if (!/^[0-9a-f-]{36}$/i.test(groupId)) return false;
  const escapedGroupId = groupId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `^${escapedGroupId}/[0-9a-f-]{36}\\.(?:jpg|jpeg|png|webp)$`,
    "i",
  ).test(path);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const cleanupSecret = request.headers.get("x-akiba-cleanup-secret");
  if (!cleanupSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: authorized, error: authorizationError } = await supabase.rpc(
    "akiba_verify_group_image_cleanup_secret",
    { p_secret: cleanupSecret },
  );
  if (authorizationError || authorized !== true) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: jobs, error: queryError } = await supabase
    .from("akiba_group_deletion_records")
    .select("group_id,image_path_for_cleanup,image_cleanup_status,image_cleanup_attempts")
    .or("image_cleanup_status.in.(pending,failed),and(image_cleanup_status.eq.processing,image_cleanup_started_at.lt." + new Date(Date.now() - 30 * 60 * 1000).toISOString() + ")")
    .lt("image_cleanup_attempts", 20)
    .not("image_path_for_cleanup", "is", null)
    .order("deleted_at", { ascending: true })
    .limit(25);

  if (queryError) {
    console.error("Group image cleanup queue could not be loaded.", queryError.code);
    return Response.json({ error: "Cleanup queue unavailable." }, { status: 500 });
  }

  const result = { claimed: 0, completed: 0, failed: 0, skipped: 0 };

  for (const job of (jobs ?? []) as CleanupJob[]) {
    if (!validImagePath(job.group_id, job.image_path_for_cleanup)) {
      const { error } = await supabase
        .from("akiba_group_deletion_records")
        .update({
          image_cleanup_status: "failed",
          image_cleanup_started_at: null,
          image_cleanup_attempts: job.image_cleanup_attempts + 1,
          image_cleanup_last_error: "Stored object path failed group-image validation.",
        })
        .eq("group_id", job.group_id)
        .eq("image_cleanup_status", job.image_cleanup_status)
        .eq("image_cleanup_attempts", job.image_cleanup_attempts);
      if (error) result.failed += 1;
      else result.failed += 1;
      continue;
    }

    const { data: claimed, error: claimError } = await supabase
      .from("akiba_group_deletion_records")
      .update({
        image_cleanup_status: "processing",
        image_cleanup_started_at: new Date().toISOString(),
        image_cleanup_attempts: job.image_cleanup_attempts + 1,
        image_cleanup_last_error: null,
      })
      .eq("group_id", job.group_id)
      .eq("image_cleanup_status", job.image_cleanup_status)
      .eq("image_cleanup_attempts", job.image_cleanup_attempts)
      .select("group_id")
      .maybeSingle();

    if (claimError) {
      result.failed += 1;
      continue;
    }
    if (!claimed) {
      result.skipped += 1;
      continue;
    }
    result.claimed += 1;

    const { error: removeError } = await supabase.storage
      .from("group-images")
      .remove([job.image_path_for_cleanup]);

    if (removeError) {
      await supabase
        .from("akiba_group_deletion_records")
        .update({
          image_cleanup_status: "failed",
          image_cleanup_started_at: null,
          image_cleanup_last_error: removeError.message.slice(0, 500),
        })
        .eq("group_id", job.group_id)
        .eq("image_cleanup_status", "processing");
      result.failed += 1;
      continue;
    }

    const { error: completeError } = await supabase
      .from("akiba_group_deletion_records")
      .update({
        image_cleanup_status: "completed",
        image_cleanup_started_at: null,
        image_path_for_cleanup: null,
        image_cleanup_last_error: null,
        image_cleaned_at: new Date().toISOString(),
      })
      .eq("group_id", job.group_id)
      .eq("image_cleanup_status", "processing");

    if (completeError) {
      result.failed += 1;
      console.error("Group image cleanup completion could not be recorded.", completeError.code);
    } else {
      result.completed += 1;
    }
  }

  // Hard-deletion cleanup queue supports group images, chat attachments and
  // private report evidence. SQL never deletes Storage objects directly.
  const staleBefore = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: storageJobs, error: storageJobsError } = await supabase
    .from("akiba_group_deletion_storage_jobs")
    .select("id,group_id,bucket_id,object_path,status,attempts")
    .or("status.in.(pending,failed),and(status.eq.processing,updated_at.lt." + staleBefore + ")")
    .lt("attempts", 20)
    .order("created_at", { ascending: true })
    .limit(50);

  if (storageJobsError) {
    console.error("Group deletion Storage cleanup queue could not be loaded.", storageJobsError.code);
  } else {
    for (const job of (storageJobs ?? []) as StorageCleanupJob[]) {
      const escapedGroupId = job.group_id.replace(/[.*+?^${}()|[\]\\]/g, "\\  return Response.json(result);
});");
      const validPath =
        job.bucket_id === "group-images"
          ? new RegExp("^" + escapedGroupId + "/[0-9a-f-]{36}\\.(?:jpg|jpeg|png|webp)$", "i").test(job.object_path)
          : job.bucket_id === "akiba-group-chat-attachments"
            ? new RegExp("^" + escapedGroupId + "/[0-9a-f-]{36}/[0-9a-f-]{36}\\.[a-z0-9]{1,8}$", "i").test(job.object_path)
            : /^[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:jpg|png|webp|pdf)$/i.test(job.object_path);

      if (!validPath) {
        await supabase.from("akiba_group_deletion_storage_jobs").update({
          status: "failed",
          attempts: job.attempts + 1,
          last_error: "Stored object path failed bucket-specific validation.",
          updated_at: new Date().toISOString(),
        }).eq("id", job.id).eq("status", job.status);
        result.failed += 1;
        continue;
      }

      const { data: claimed, error: claimError } = await supabase
        .from("akiba_group_deletion_storage_jobs")
        .update({
          status: "processing",
          attempts: job.attempts + 1,
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id)
        .eq("status", job.status)
        .eq("attempts", job.attempts)
        .select("id")
        .maybeSingle();

      if (claimError) {
        result.failed += 1;
        continue;
      }
      if (!claimed) {
        result.skipped += 1;
        continue;
      }
      result.claimed += 1;

      const { error: removeError } = await supabase.storage
        .from(job.bucket_id)
        .remove([job.object_path]);

      if (removeError) {
        await supabase.from("akiba_group_deletion_storage_jobs").update({
          status: "failed",
          last_error: removeError.message.slice(0, 500),
          updated_at: new Date().toISOString(),
        }).eq("id", job.id).eq("status", "processing");
        result.failed += 1;
        continue;
      }

      const { error: completeError } = await supabase
        .from("akiba_group_deletion_storage_jobs")
        .update({
          status: "completed",
          last_error: null,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id)
        .eq("status", "processing");

      if (completeError) {
        result.failed += 1;
        console.error("Group deletion Storage cleanup completion could not be recorded.", completeError.code);
      } else {
        result.completed += 1;
      }
    }
  }

  return Response.json(result);
});
