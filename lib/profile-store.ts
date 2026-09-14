import { createSupabase, hasSupabase } from "./supabase";
import { Profile, ProfileComment, ProfilePhoto } from "./types";

const KEY = "matchbook_profiles_v1";

const mapRow = (row: any): Profile => ({
  id: row.id, name: row.name || "", dateOfBirth: row.date_of_birth || "", gender: row.gender || "",
  motherTongue: row.mother_tongue || "", languages: row.languages || "", education: row.education || "",
  job: row.job || "", height: row.height || "", weight: row.weight || "", religion: row.religion || "",
  originallyFrom: row.originally_from || "", residence: row.residence || "", familyDetails: row.family_details || "",
  hobbies: row.hobbies || "", phone: row.phone || "", maritalStatus: row.marital_status || "",
  partnerPreference: row.partner_preference || "", rawText: row.raw_text || "", status: row.status || "review",
  createdAt: row.created_at, photos: (row.profile_photos || []).map((p: any) => ({ id: p.id, path: p.storage_path, url: p.signed_url || "", name: p.file_name })),
  comments: (row.profile_comments || []).map((c: any) => ({ id: c.id, body: c.body, createdAt: c.created_at }))
});

const toRow = (p: Profile) => ({ id: p.id, name: p.name, date_of_birth: p.dateOfBirth, gender: p.gender,
  mother_tongue: p.motherTongue, languages: p.languages, education: p.education, job: p.job,
  height: p.height, weight: p.weight, religion: p.religion, originally_from: p.originallyFrom,
  residence: p.residence, family_details: p.familyDetails, hobbies: p.hobbies, phone: p.phone,
  marital_status: p.maritalStatus, partner_preference: p.partnerPreference, raw_text: p.rawText,
  status: p.status, created_at: p.createdAt });

function localRead(): Profile[] { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } }
function localWrite(items: Profile[]) { localStorage.setItem(KEY, JSON.stringify(items)); }

export const profileStore = {
  isDemo: !hasSupabase,
  async list(): Promise<Profile[]> {
    if (!hasSupabase) return localRead();
    const sb = createSupabase()!;
    const { data, error } = await sb.from("profiles").select("*, profile_photos(*), profile_comments(*)").order("created_at", { ascending: false });
    if (error) throw error;
    const rows = data || [];
    for (const row of rows) {
      for (const photo of row.profile_photos || []) {
        const { data: signed } = await sb.storage.from("profile-photos").createSignedUrl(photo.storage_path, 3600);
        photo.signed_url = signed?.signedUrl || "";
      }
    }
    return rows.map(mapRow);
  },
  async save(profile: Profile): Promise<void> {
    if (!hasSupabase) { const all = localRead(); const i = all.findIndex(p => p.id === profile.id); i >= 0 ? all.splice(i, 1, profile) : all.unshift(profile); localWrite(all); return; }
    const sb = createSupabase()!; const { data: user } = await sb.auth.getUser();
    const { error } = await sb.from("profiles").upsert({ ...toRow(profile), user_id: user.user?.id });
    if (error) throw error;
  },
  async remove(profile: Profile): Promise<void> {
    if (!hasSupabase) { localWrite(localRead().filter(p => p.id !== profile.id)); return; }
    const sb = createSupabase()!;
    const paths = profile.photos.map(p => p.path).filter(Boolean) as string[];
    if (paths.length) await sb.storage.from("profile-photos").remove(paths);
    const { error } = await sb.from("profiles").delete().eq("id", profile.id); if (error) throw error;
  },
  async upload(profile: Profile, files: File[]): Promise<ProfilePhoto[]> {
    if (!hasSupabase) return Promise.all(files.map(file => new Promise<ProfilePhoto>((resolve, reject) => { const reader = new FileReader(); reader.onerror = () => reject(reader.error); reader.onload = () => resolve({ id: crypto.randomUUID(), url: String(reader.result), name: file.name }); reader.readAsDataURL(file); })));
    const sb = createSupabase()!; const created: ProfilePhoto[] = [];
    for (const file of files) {
      const id = crypto.randomUUID(); const path = `${profile.id}/${id}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
      const { error: uploadError } = await sb.storage.from("profile-photos").upload(path, file); if (uploadError) throw uploadError;
      const { error: rowError } = await sb.from("profile_photos").insert({ id, profile_id: profile.id, storage_path: path, file_name: file.name }); if (rowError) throw rowError;
      const { data } = await sb.storage.from("profile-photos").createSignedUrl(path, 3600); created.push({ id, path, url: data?.signedUrl || "", name: file.name });
    }
    return created;
  },
  async addComment(profile: Profile, body: string): Promise<ProfileComment> {
    const comment = { id: crypto.randomUUID(), body, createdAt: new Date().toISOString() };
    if (hasSupabase) { const sb = createSupabase()!; const { error } = await sb.from("profile_comments").insert({ id: comment.id, profile_id: profile.id, body }); if (error) throw error; }
    return comment;
  }
};
