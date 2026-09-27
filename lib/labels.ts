/** Display labels for database enums. Shared by server and client components. */
import type {
  AchievementCategory,
  AnnouncementCategory,
  BloodGroup,
  CalendarEventType,
  ContactPreference,
  EmploymentStatus,
  EventType,
  OpportunityType,
  PostType,
  Priority,
  ProjectCategory,
  ReactionType,
  ResourceCategory,
  Role,
} from "@/lib/generated/prisma/enums";

export const ROLE_LABELS: Record<Role, string> = {
  STUDENT: "Student",
  MODERATOR: "Moderator",
  ADMIN: "Admin",
};

export const BLOOD_GROUP_LABELS: Record<BloodGroup, string> = {
  A_POS: "A+",
  A_NEG: "A−",
  B_POS: "B+",
  B_NEG: "B−",
  AB_POS: "AB+",
  AB_NEG: "AB−",
  O_POS: "O+",
  O_NEG: "O−",
};

export const EMPLOYMENT_LABELS: Record<EmploymentStatus, string> = {
  STUDENT: "Student",
  EMPLOYED: "Employed",
  INTERN: "Intern",
  FREELANCER: "Freelancer",
  SEEKING: "Open to work",
  HIGHER_STUDIES: "Higher studies",
  ENTREPRENEUR: "Entrepreneur",
  OTHER: "Other",
};

export const ANNOUNCEMENT_CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  ACADEMIC: "Academic",
  EVENT: "Event",
  IMPORTANT: "Important",
  GENERAL: "General",
  EMERGENCY: "Emergency",
  CAREER: "Career",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  MEETUP: "Batch meetup",
  TOUR: "Tour",
  SPORTS: "Sports",
  REUNION: "Reunion",
  IFTAR: "Iftar",
  HACKATHON: "Hackathon",
  WORKSHOP: "Workshop",
  SEMINAR: "Seminar",
  ACADEMIC: "Academic",
  OTHER: "Other",
};

export const POST_TYPE_LABELS: Record<PostType, string> = {
  GENERAL: "General",
  QUESTION: "Question",
  DISCUSSION: "Discussion",
  ACHIEVEMENT: "Achievement",
  OPPORTUNITY: "Opportunity",
  PROJECT: "Project",
  ANNOUNCEMENT: "Announcement",
};

export const REACTION_META: Record<ReactionType, { label: string; emoji: string }> = {
  LIKE: { label: "Like", emoji: "👍" },
  LOVE: { label: "Love", emoji: "❤️" },
  CELEBRATE: { label: "Celebrate", emoji: "🎉" },
  INSIGHTFUL: { label: "Insightful", emoji: "💡" },
  FUNNY: { label: "Funny", emoji: "😄" },
};

export const RESOURCE_CATEGORY_LABELS: Record<ResourceCategory, string> = {
  COURSE: "Course material",
  NOTES: "Notes",
  SLIDES: "Slides",
  PREVIOUS_QUESTIONS: "Previous questions",
  LAB: "Lab resources",
  ASSIGNMENT: "Assignments",
  TUTORIAL: "Tutorials",
  LINK: "Useful links",
};

export const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  INTERNSHIP: "Internship",
  JOB: "Job",
  HACKATHON: "Hackathon",
  SCHOLARSHIP: "Scholarship",
  COMPETITION: "Competition",
  RESEARCH: "Research",
  FREELANCING: "Freelancing",
};

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  HACKATHON: "Hackathon award",
  MUN: "MUN award",
  RESEARCH: "Research paper",
  SCHOLARSHIP: "Scholarship",
  CERTIFICATION: "Certification",
  COMPETITION: "Competition result",
  JOB: "Job",
  STARTUP: "Startup",
  OTHER: "Other",
};

export const PROJECT_CATEGORY_LABELS: Record<ProjectCategory, string> = {
  WEB: "Web",
  MOBILE: "Mobile",
  AI_ML: "AI / ML",
  CYBER_SECURITY: "Cyber Security",
  IOT: "IoT",
  ROBOTICS: "Robotics",
  DATA_SCIENCE: "Data Science",
  OTHER: "Other",
};

export const CALENDAR_TYPE_LABELS: Record<CalendarEventType, string> = {
  EXAM: "Exam",
  ASSIGNMENT: "Assignment",
  DEADLINE: "Deadline",
  BATCH_EVENT: "Batch event",
  COMPETITION: "Competition",
  WORKSHOP: "Workshop",
  OTHER: "Other",
};

export const CONTACT_PREFERENCE_LABELS: Record<ContactPreference, string> = {
  IN_APP: "Message me here (comment / profile)",
  EMAIL: "Email",
  PHONE: "Phone",
  FACEBOOK: "Facebook",
  LINKEDIN: "LinkedIn",
};

/** Turns a label map into `<select>` options. */
export function options<T extends string>(labels: Record<T, string>) {
  return (Object.entries(labels) as [T, string][]).map(([value, label]) => ({ value, label }));
}
