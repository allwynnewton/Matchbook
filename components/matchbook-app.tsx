"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BriefcaseBusiness, Cake, Camera, Check, ChevronRight, Heart, Home, ImagePlus, Languages, LogOut, MapPin, MessageSquare, MoreVertical, Pencil, Plus, Search, ShieldCheck, Sparkles, Trash2, Upload, UserRound, UsersRound, X } from "lucide-react";
import { ageFromDob, hasRecognizedFields, parseProfileText } from "@/lib/parser";
import { profileStore } from "@/lib/profile-store";
import { emptyProfile, Profile, ProfileStatus } from "@/lib/types";
import { createSupabase, hasSupabase } from "@/lib/supabase";

type View = "profiles" | "add" | "detail";
const fields: Array<[keyof Profile, string, string]> = [
  ["name", "Full name", "Jessica Audrey D'Souza"], ["dateOfBirth", "Date of birth", "11th July 2000"],
  ["gender", "Gender", "Female"], ["motherTongue", "Mother tongue", "Konkani"],
  ["languages", "Languages known", "English, Kannada, Hindi, Konkani"], ["education", "Education", "B.E. in Computer Science"],
  ["job", "Present job and place", "Software Developer, Bangalore"], ["height", "Height", "5'5\""],
  ["weight", "Weight", "48 kg"], ["religion", "Religion", "Roman Catholic"],
  ["originallyFrom", "Originally from", "Kankanady, Mangalore"], ["residence", "Present residence", "Bangalore"],
  ["familyDetails", "Family details", "Father, Mother, no siblings"], ["hobbies", "Hobbies", "Movies, knitting, badminton"],
  ["phone", "WhatsApp / mobile number", "Phone number"], ["maritalStatus", "Marital status", "Unmarried"],
  ["partnerPreference", "Partner preference", "Age, height, place of work..."]
];
const statusLabel: Record<ProfileStatus, string> = { review: "Review later", shortlisted: "Shortlisted", contacted: "Contacted", not_interested: "Not interested" };
const sample = `1) Name: Jessica Audrey DSouza

2) Date of birth: 11th July 2000

3) Gender (Male/Female): Female

4) Mother Tongue: Konkani

5) Languages known: English, Kannada, Hindi Konkani

6) Educational Qualification: B.E. in Computer Science

7) Present Job and place: Software Developer, Bangalore

8) Height: 5’5”

9) Weight: 48 kg

10) Religion: Roman Catholic

11) Originally from: Kankanady, Mangalore

12) Present Residence: Bangalore

13) Family details (Parents, Brothers, Sisters): Father, Mother, no siblings

14) Hobbies: Watching movies/series, knitting, badminton

15) WhatsApp No/Cell no: 8762070186 / 7829639716 (Father)

16) Marital status (Unmarried/Widow/Divorcee): Unmarried

17) Partner preference (mandatory): Age within 31yrs, height:5'8" to 6'1", working in Bangalore or Gulf`;

function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map(n => n[0]).join("").toUpperCase() || "?"; }
function maskPhone(value: string) { return value.replace(/(\d{2})\d{6}(\d{2})/g, "$1••••••$2"); }

export default function MatchbookApp() {
  const [authReady, setAuthReady] = useState(!hasSupabase);
  const [signedIn, setSignedIn] = useState(!hasSupabase);
  const [view, setView] = useState<View>("profiles");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Profile>(emptyProfile());
  const [raw, setRaw] = useState("");
  const [parsed, setParsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | ProfileStatus>("all");
  const [comment, setComment] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => { try { setProfiles(await profileStore.list()); } catch (e) { setNotice(e instanceof Error ? e.message : "Could not load profiles"); } };
  useEffect(() => {
    if (!hasSupabase) { load(); return; }
    const sb = createSupabase()!;
    sb.auth.getSession().then(({ data }) => { setSignedIn(Boolean(data.session)); setAuthReady(true); if (data.session) load(); });
    const { data } = sb.auth.onAuthStateChange((_event, session) => { setSignedIn(Boolean(session)); setAuthReady(true); if (session) load(); });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (!notice) return; const id = setTimeout(() => setNotice(""), 3500); return () => clearTimeout(id); }, [notice]);

  const filtered = useMemo(() => profiles.filter(p => {
    const text = `${p.name} ${p.job} ${p.residence} ${p.education} ${p.originallyFrom}`.toLowerCase();
    return (filter === "all" || p.status === filter) && text.includes(query.toLowerCase());
  }), [profiles, query, filter]);

  const beginAdd = () => { setRaw(""); setDraft(emptyProfile()); setParsed(false); setView("add"); };
  const doParse = () => { if (!raw.trim()) return; const result = parseProfileText(raw); if (!hasRecognizedFields(result)) { setNotice("Couldn't read this profile. Make sure each line has a label and value, e.g. \"Name: ...\"."); return; } setDraft(result); setParsed(true); };
  const saveDraft = async () => { if (!draft.name.trim()) { setNotice("Please enter a name before saving."); return; } setBusy(true); try { await profileStore.save(draft); await load(); setSelected(draft); setView("detail"); setParsed(false); setNotice("Profile saved"); } catch (e) { setNotice(e instanceof Error ? e.message : "Could not save profile"); } finally { setBusy(false); } };
  const updateSelected = async (next: Profile) => { setBusy(true); try { await profileStore.save(next); setSelected(next); setProfiles(old => old.map(p => p.id === next.id ? next : p)); setEditing(false); setNotice("Changes saved"); } catch (e) { setNotice(e instanceof Error ? e.message : "Could not save changes"); } finally { setBusy(false); } };
  const openProfile = (p: Profile) => { setSelected(p); setDraft(p); setEditing(false); setView("detail"); };
  const removeProfile = async () => { if (!selected || !confirm(`Delete ${selected.name}'s profile and all photos? This cannot be undone.`)) return; setBusy(true); try { await profileStore.remove(selected); setProfiles(p => p.filter(x => x.id !== selected.id)); setSelected(null); setView("profiles"); setNotice("Profile deleted"); } finally { setBusy(false); } };
  const uploadPhotos = async (files: FileList | null) => { if (!selected || !files?.length) return; setBusy(true); try { const photos = await profileStore.upload(selected, Array.from(files)); const next = { ...selected, photos: [...selected.photos, ...photos] }; await profileStore.save(next); setSelected(next); setProfiles(p => p.map(x => x.id === next.id ? next : x)); setNotice(`${photos.length} photo${photos.length > 1 ? "s" : ""} added`); } catch (e) { setNotice(e instanceof Error ? e.message : "Upload failed"); } finally { setBusy(false); } };
  const addComment = async () => { if (!selected || !comment.trim()) return; setBusy(true); try { const c = await profileStore.addComment(selected, comment.trim()); const next = { ...selected, comments: [...selected.comments, c] }; if (profileStore.isDemo) await profileStore.save(next); setSelected(next); setProfiles(p => p.map(x => x.id === next.id ? next : x)); setComment(""); } finally { setBusy(false); } };
  const signOut = async () => { if (!hasSupabase) return; if (!confirm("Sign out of Matchbook?")) return; setBusy(true); try { await createSupabase()!.auth.signOut(); setProfiles([]); setSelected(null); setView("profiles"); setSignedIn(false); } catch (e) { setNotice(e instanceof Error ? e.message : "Could not sign out"); } finally { setBusy(false); } };

  if (!authReady) return <div className="auth-loading"><span /></div>;
  if (!signedIn) return <AuthScreen onSignedIn={() => { setSignedIn(true); load(); }} />;

  return <div className="app-shell">
    <aside className="sidebar">
      <button className="brand" onClick={() => setView("profiles")}><span className="brand-mark"><Heart size={19} fill="currentColor" /></span><span>Matchbook<small>Private profile organizer</small></span></button>
      <nav>
        <button className={view === "profiles" || view === "detail" ? "active" : ""} onClick={() => setView("profiles")}><UsersRound /> Profiles <span>{profiles.length}</span></button>
        <button className={view === "add" ? "active" : ""} onClick={beginAdd}><Plus /> Add profile</button>
      </nav>
      <div className="privacy-card"><ShieldCheck /><div><strong>Your private space</strong><p>Profiles and photos are visible only to your account.</p></div></div>
      <div className="sidebar-foot"><span className="avatar-mini">AH</span><div><strong>Allwyn</strong><small>{profileStore.isDemo ? "Demo workspace" : "Private account"}</small></div>{profileStore.isDemo ? <MoreVertical /> : <button className="foot-logout" onClick={signOut} title="Sign out" aria-label="Sign out"><LogOut /></button>}</div>
    </aside>

    <main>
      <header className="mobile-head"><button className="brand" onClick={() => setView("profiles")}><span className="brand-mark"><Heart size={17} fill="currentColor" /></span><span>Matchbook</span></button><div className="mobile-head-actions"><button className="icon-button" onClick={beginAdd} aria-label="Add profile"><Plus /></button>{!profileStore.isDemo && <button className="icon-button" onClick={signOut} aria-label="Sign out"><LogOut /></button>}</div></header>
      {profileStore.isDemo && <div className="demo-banner"><Sparkles /> Demo mode is active. Your entries remain on this device until Supabase is connected.</div>}
      {view === "profiles" && <section className="page profiles-page">
        <div className="page-title"><div><p className="eyebrow">YOUR PRIVATE COLLECTION</p><h1>Profiles</h1><p>Keep every promising match organized in one calm place.</p></div><button className="primary" onClick={beginAdd}><Plus /> Add profile</button></div>
        <div className="toolbar"><label className="search"><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, city, job or education" /></label><div className="filters">{(["all", "shortlisted", "review", "contacted", "not_interested"] as const).map(s => <button key={s} className={filter === s ? "active" : ""} onClick={() => setFilter(s)}>{s === "all" ? "All" : statusLabel[s]}</button>)}</div></div>
        {filtered.length ? <div className="profile-grid">{filtered.map(p => <article className="profile-card" key={p.id} onClick={() => openProfile(p)}>
          <div className="portrait">{p.photos[0]?.url ? <img src={p.photos[0].url} alt="" /> : <span>{initials(p.name)}</span>}<div className={`status-dot ${p.status}`} /></div>
          <div className="card-body"><div className="card-top"><span className={`status-pill ${p.status}`}>{statusLabel[p.status]}</span><ChevronRight /></div><h2>{p.name}</h2><p className="headline">{[ageFromDob(p.dateOfBirth) && `${ageFromDob(p.dateOfBirth)} years`, p.height, p.religion].filter(Boolean).join(" · ")}</p><div className="quick-facts"><span><BriefcaseBusiness />{p.job || "Job not added"}</span><span><MapPin />{p.residence || p.originallyFrom || "Location not added"}</span></div></div>
        </article>)}</div> : <div className="empty"><div><UsersRound /></div><h2>{profiles.length ? "No profiles match that search" : "Your profile list is empty"}</h2><p>{profiles.length ? "Try another search or filter." : "Paste your first WhatsApp profile and Matchbook will organize it for you."}</p>{!profiles.length && <button className="primary" onClick={beginAdd}><Plus /> Add your first profile</button>}</div>}
      </section>}

      {view === "add" && <section className="page add-page">
        <button className="back" onClick={() => parsed ? setParsed(false) : setView("profiles")}><ArrowLeft /> {parsed ? "Back to pasted text" : "All profiles"}</button>
        {!parsed ? <><div className="page-title compact"><div><p className="eyebrow">NEW PROFILE</p><h1>Paste from WhatsApp</h1><p>Copy the complete message. We’ll separate it into editable fields.</p></div></div><div className="import-layout"><div className="paste-card"><div className="paste-head"><span><MessageSquare /> Profile text</span><button onClick={() => setRaw(sample)}>Use sample</button></div><textarea value={raw} onChange={e => setRaw(e.target.value)} placeholder="Paste the numbered matrimonial profile here…" autoFocus /><div className="paste-foot"><span>{raw.length.toLocaleString()} characters</span><button className="primary" onClick={doParse} disabled={!raw.trim()}><Sparkles /> Parse profile</button></div></div><aside className="how-card"><div className="step"><span>1</span><div><strong>Copy</strong><p>Copy a full matrimonial profile from WhatsApp.</p></div></div><div className="step"><span>2</span><div><strong>Paste & review</strong><p>We fill the fields and you correct anything needed.</p></div></div><div className="step"><span>3</span><div><strong>Save privately</strong><p>Add photos and personal comments afterward.</p></div></div></aside></div></> : <ProfileForm profile={draft} setProfile={setDraft} title="Review extracted details" subtitle="Check the fields before saving. You can edit everything now or later." onSave={saveDraft} busy={busy} />}
      </section>}

      {view === "detail" && selected && <section className="page detail-page">
        <button className="back" onClick={() => setView("profiles")}><ArrowLeft /> All profiles</button>
        {editing ? <ProfileForm profile={draft} setProfile={setDraft} title="Edit profile" subtitle={`Update ${selected.name}'s information.`} onSave={() => updateSelected(draft)} busy={busy} /> : <>
          <div className="profile-hero"><div className="large-portrait">{selected.photos[0]?.url ? <img src={selected.photos[0].url} alt="" /> : <span>{initials(selected.name)}</span>}</div><div className="hero-copy"><select value={selected.status} onChange={e => updateSelected({ ...selected, status: e.target.value as ProfileStatus })} className={`status-select ${selected.status}`}>{Object.entries(statusLabel).map(([v, l]) => <option value={v} key={v}>{l}</option>)}</select><h1>{selected.name}</h1><p>{[ageFromDob(selected.dateOfBirth) && `${ageFromDob(selected.dateOfBirth)} years`, selected.height, selected.residence].filter(Boolean).join(" · ")}</p></div><div className="hero-actions"><button className="secondary" onClick={() => { setDraft(selected); setEditing(true); }}><Pencil /> Edit</button><button className="icon-button danger" onClick={removeProfile} aria-label="Delete profile"><Trash2 /></button></div></div>
          <div className="detail-columns"><div className="detail-main"><InfoSection profile={selected} /><section className="panel photos"><div className="section-head"><div><h2>Photos</h2><p>{selected.photos.length ? `${selected.photos.length} saved` : "No photos added yet"}</p></div><label className="secondary upload-label"><ImagePlus /> Add photos<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic" onChange={e => uploadPhotos(e.target.files)} /></label></div>{selected.photos.length ? <div className="photo-grid">{selected.photos.map(p => <img key={p.id} src={p.url} alt={`${selected.name} photo`} />)}</div> : <label className="photo-empty"><Camera /><strong>Add one or more photos</strong><span>JPG, PNG, WEBP or HEIC · up to 10 MB each</span><input type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic" onChange={e => uploadPhotos(e.target.files)} /></label>}</section></div>
            <aside className="comments panel"><div className="section-head"><div><h2>My comments</h2><p>Private notes about this profile</p></div></div><div className="comment-compose"><textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Write what you liked, questions to ask, or anything to remember…" /><button className="primary" disabled={!comment.trim() || busy} onClick={addComment}>Add comment</button></div><div className="comment-list">{selected.comments.length ? [...selected.comments].reverse().map(c => <div className="comment-item" key={c.id}><p>{c.body}</p><time>{new Date(c.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</time></div>) : <div className="comment-empty"><MessageSquare /><p>No comments yet.</p></div>}</div></aside></div>
        </>}
      </section>}
      <nav className="bottom-nav"><button className={view !== "add" ? "active" : ""} onClick={() => setView("profiles")}><Home />Profiles</button><button className={view === "add" ? "active" : ""} onClick={beginAdd}><span className="add-circle"><Plus /></span>Add profile</button></nav>
    </main>
    {notice && <div className="toast"><Check /> {notice}<button onClick={() => setNotice("")}><X /></button></div>}
    {busy && <div className="busy" aria-label="Saving"><span /></div>}
  </div>;
}

function AuthScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login"); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setError(""); const sb = createSupabase()!;
    const result = mode === "login" ? await sb.auth.signInWithPassword({ email, password }) : await sb.auth.signUp({ email, password });
    setBusy(false); if (result.error) setError(result.error.message); else if (result.data.session) onSignedIn(); else setError("Check your email to confirm your account, then sign in.");
  };
  return <main className="auth-page"><section className="auth-brand"><span className="brand-mark"><Heart fill="currentColor" /></span><h1>Matchbook</h1><p>Your private place to organize promising matrimonial profiles.</p><div className="auth-points"><span><ShieldCheck /> Private by default</span><span><Sparkles /> Paste and organize in seconds</span><span><Camera /> Keep photos and notes together</span></div></section><section className="auth-form-wrap"><form className="auth-card" onSubmit={submit}><p className="eyebrow">PRIVATE WORKSPACE</p><h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2><p>{mode === "login" ? "Sign in to open your saved profiles." : "Use an email address only you can access."}</p><label><span>Email address</span><input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label><label><span>Password</span><input type="password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" /></label>{error && <div className="auth-error">{error}</div>}<button className="primary" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button><button type="button" className="auth-switch" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}>{mode === "login" ? "First time here? Create an account" : "Already have an account? Sign in"}</button></form></section></main>;
}

function ProfileForm({ profile, setProfile, title, subtitle, onSave, busy }: { profile: Profile; setProfile: (p: Profile) => void; title: string; subtitle: string; onSave: () => void; busy: boolean }) {
  return <div className="form-wrap"><div className="page-title compact"><div><p className="eyebrow">CHECK DETAILS</p><h1>{title}</h1><p>{subtitle}</p></div><button className="primary desktop-save" onClick={onSave} disabled={busy}><Check /> Save profile</button></div><div className="form-card"><div className="form-grid">{fields.map(([key, label, placeholder]) => { const large = ["familyDetails", "hobbies", "partnerPreference"].includes(key as string); return <label key={key} className={large ? "wide" : ""}><span>{label}</span>{large ? <textarea value={String(profile[key] || "")} onChange={e => setProfile({ ...profile, [key]: e.target.value })} placeholder={placeholder} /> : <input value={String(profile[key] || "")} onChange={e => setProfile({ ...profile, [key]: e.target.value })} placeholder={placeholder} />}</label>; })}</div><div className="mobile-save"><button className="primary" onClick={onSave} disabled={busy}><Check /> Save profile</button></div></div></div>;
}

function InfoSection({ profile }: { profile: Profile }) {
  const items = [[Cake, "Date of birth", profile.dateOfBirth], [UserRound, "Gender", profile.gender], [Languages, "Mother tongue & languages", [profile.motherTongue, profile.languages].filter(Boolean).join(" · ")], [BriefcaseBusiness, "Education", profile.education], [BriefcaseBusiness, "Work", profile.job], [UserRound, "Height & weight", [profile.height, profile.weight].filter(Boolean).join(" · ")], [Heart, "Religion & marital status", [profile.religion, profile.maritalStatus].filter(Boolean).join(" · ")], [MapPin, "Originally from", profile.originallyFrom], [Home, "Present residence", profile.residence], [UsersRound, "Family", profile.familyDetails], [Sparkles, "Hobbies", profile.hobbies], [MessageSquare, "Contact", maskPhone(profile.phone)], [Heart, "Partner preference", profile.partnerPreference]] as const;
  return <section className="panel info"><div className="section-head"><div><h2>Profile details</h2><p>Saved {new Date(profile.createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</p></div></div><div className="info-grid">{items.filter(([, , v]) => v).map(([Icon, label, value]) => <div className="info-item" key={label}><span className="info-icon"><Icon /></span><div><small>{label}</small><p>{value}</p></div></div>)}</div></section>;
}
