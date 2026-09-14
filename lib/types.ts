export type ProfileStatus = "review" | "shortlisted" | "contacted" | "not_interested";

export interface ProfilePhoto { id: string; url: string; path?: string; name?: string }
export interface ProfileComment { id: string; body: string; createdAt: string }

export interface Profile {
  id: string;
  name: string;
  dateOfBirth: string;
  gender: string;
  motherTongue: string;
  languages: string;
  education: string;
  job: string;
  height: string;
  weight: string;
  religion: string;
  originallyFrom: string;
  residence: string;
  familyDetails: string;
  hobbies: string;
  phone: string;
  maritalStatus: string;
  partnerPreference: string;
  rawText: string;
  status: ProfileStatus;
  createdAt: string;
  photos: ProfilePhoto[];
  comments: ProfileComment[];
}

export const emptyProfile = (): Profile => ({
  id: crypto.randomUUID(), name: "", dateOfBirth: "", gender: "", motherTongue: "",
  languages: "", education: "", job: "", height: "", weight: "", religion: "",
  originallyFrom: "", residence: "", familyDetails: "", hobbies: "", phone: "",
  maritalStatus: "", partnerPreference: "", rawText: "", status: "review",
  createdAt: new Date().toISOString(), photos: [], comments: []
});
