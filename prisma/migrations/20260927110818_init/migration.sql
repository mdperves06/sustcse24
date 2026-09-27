-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('BATCH', 'PRIVATE');

-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG');

-- CreateEnum
CREATE TYPE "EmploymentStatus" AS ENUM ('STUDENT', 'EMPLOYED', 'INTERN', 'FREELANCER', 'SEEKING', 'HIGHER_STUDIES', 'ENTREPRENEUR', 'OTHER');

-- CreateEnum
CREATE TYPE "SkillCategory" AS ENUM ('LANGUAGE', 'FRAMEWORK', 'TOOL', 'OTHER');

-- CreateEnum
CREATE TYPE "AnnouncementCategory" AS ENUM ('ACADEMIC', 'EVENT', 'IMPORTANT', 'GENERAL', 'EMERGENCY', 'CAREER');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('MEETUP', 'TOUR', 'SPORTS', 'REUNION', 'IFTAR', 'HACKATHON', 'WORKSHOP', 'SEMINAR', 'ACADEMIC', 'OTHER');

-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('GOING', 'MAYBE', 'NOT_GOING');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('GENERAL', 'QUESTION', 'DISCUSSION', 'ACHIEVEMENT', 'OPPORTUNITY', 'PROJECT', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'LOVE', 'CELEBRATE', 'INSIGHTFUL', 'FUNNY');

-- CreateEnum
CREATE TYPE "ReportTarget" AS ENUM ('POST', 'COMMENT');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ResourceCategory" AS ENUM ('COURSE', 'NOTES', 'SLIDES', 'PREVIOUS_QUESTIONS', 'LAB', 'ASSIGNMENT', 'TUTORIAL', 'LINK');

-- CreateEnum
CREATE TYPE "OpportunityType" AS ENUM ('INTERNSHIP', 'JOB', 'HACKATHON', 'SCHOLARSHIP', 'COMPETITION', 'RESEARCH', 'FREELANCING');

-- CreateEnum
CREATE TYPE "AchievementCategory" AS ENUM ('HACKATHON', 'MUN', 'RESEARCH', 'SCHOLARSHIP', 'CERTIFICATION', 'COMPETITION', 'JOB', 'STARTUP', 'OTHER');

-- CreateEnum
CREATE TYPE "AchievementStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProjectCategory" AS ENUM ('WEB', 'MOBILE', 'AI_ML', 'CYBER_SECURITY', 'IOT', 'ROBOTICS', 'DATA_SCIENCE', 'OTHER');

-- CreateEnum
CREATE TYPE "GroupRole" AS ENUM ('MEMBER', 'MANAGER');

-- CreateEnum
CREATE TYPE "CalendarEventType" AS ENUM ('EXAM', 'ASSIGNMENT', 'DEADLINE', 'BATCH_EVENT', 'COMPETITION', 'WORKSHOP', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactPreference" AS ENUM ('IN_APP', 'EMAIL', 'PHONE', 'FACEBOOK', 'LINKEDIN');

-- CreateEnum
CREATE TYPE "TeammateRequestStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ANNOUNCEMENT', 'EVENT_REMINDER', 'COMMENT', 'REACTION', 'POLL', 'OPPORTUNITY_DEADLINE', 'ACHIEVEMENT_VERIFICATION', 'PROJECT_INTERACTION', 'BIRTHDAY', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "roll" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "postingRestrictedUntil" TIMESTAMP(3),
    "restrictionReason" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "studentId" TEXT,
    "nickname" TEXT,
    "phone" TEXT,
    "bloodGroup" "BloodGroup",
    "location" TEXT,
    "bio" TEXT,
    "dateOfBirth" DATE,
    "department" TEXT NOT NULL DEFAULT 'Computer Science & Engineering',
    "batch" TEXT NOT NULL DEFAULT 'CSE 24',
    "avatarKey" TEXT,
    "cvKey" TEXT,
    "cvFileName" TEXT,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "academicInterests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "facebookUrl" TEXT,
    "linkedinUrl" TEXT,
    "githubUrl" TEXT,
    "portfolioUrl" TEXT,
    "otherLinks" JSONB NOT NULL DEFAULT '[]',
    "currentOrganization" TEXT,
    "position" TEXT,
    "industry" TEXT,
    "employmentStatus" "EmploymentStatus" NOT NULL DEFAULT 'STUDENT',
    "careerInterests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hobbies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "privacy_settings" (
    "userId" TEXT NOT NULL,
    "emailVisibility" "Visibility" NOT NULL DEFAULT 'BATCH',
    "phoneVisibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "facebookVisibility" "Visibility" NOT NULL DEFAULT 'BATCH',
    "linkedinVisibility" "Visibility" NOT NULL DEFAULT 'BATCH',
    "githubVisibility" "Visibility" NOT NULL DEFAULT 'BATCH',
    "locationVisibility" "Visibility" NOT NULL DEFAULT 'BATCH',
    "birthdayVisibility" "Visibility" NOT NULL DEFAULT 'BATCH',
    "bloodGroupVisibility" "Visibility" NOT NULL DEFAULT 'BATCH',
    "careerVisibility" "Visibility" NOT NULL DEFAULT 'BATCH',
    "cvVisibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "privacy_settings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "rememberMe" BOOLEAN NOT NULL DEFAULT false,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limits" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "resetAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "SkillCategory" NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_skills" (
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "profile_skills_pkey" PRIMARY KEY ("userId","skillId")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "AnnouncementCategory" NOT NULL DEFAULT 'GENERAL',
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "authorId" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "attachmentKey" TEXT,
    "attachmentName" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "EventType" NOT NULL DEFAULT 'MEETUP',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "location" TEXT NOT NULL,
    "organizer" TEXT NOT NULL,
    "coverKey" TEXT,
    "registrationDeadline" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_attendees" (
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RsvpStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_attendees_pkey" PRIMARY KEY ("eventId","userId")
);

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "groupId" TEXT,
    "type" "PostType" NOT NULL DEFAULT 'GENERAL',
    "content" TEXT NOT NULL,
    "linkUrl" TEXT,
    "imageKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "editedAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),
    "removedById" TEXT,
    "removedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "removedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reactions" (
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL DEFAULT 'LIKE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reactions_pkey" PRIMARY KEY ("postId","userId")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" "ReportTarget" NOT NULL,
    "postId" TEXT,
    "commentId" TEXT,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "polls" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "description" TEXT,
    "multipleChoice" BOOLEAN NOT NULL DEFAULT false,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_options" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_ballots" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poll_ballots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_votes" (
    "ballotId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,

    CONSTRAINT "poll_votes_pkey" PRIMARY KEY ("ballotId","optionId")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "course" TEXT NOT NULL,
    "category" "ResourceCategory" NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileKey" TEXT,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "url" TEXT,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunities" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "OpportunityType" NOT NULL,
    "location" TEXT,
    "deadline" TIMESTAMP(3),
    "applyUrl" TEXT,
    "postedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_bookmarks" (
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunity_bookmarks_pkey" PRIMARY KEY ("userId","opportunityId")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "AchievementCategory" NOT NULL,
    "achievedOn" DATE,
    "link" TEXT,
    "status" "AchievementStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "githubUrl" TEXT,
    "demoUrl" TEXT,
    "category" "ProjectCategory" NOT NULL DEFAULT 'OTHER',
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_images" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "project_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("projectId","userId")
);

-- CreateTable
CREATE TABLE "project_likes" (
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_likes_pkey" PRIMARY KEY ("projectId","userId")
);

-- CreateTable
CREATE TABLE "project_bookmarks" (
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_bookmarks_pkey" PRIMARY KEY ("projectId","userId")
);

-- CreateTable
CREATE TABLE "teammate_requests" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "teammatesNeeded" INTEGER NOT NULL DEFAULT 1,
    "deadline" TIMESTAMP(3),
    "contactPreference" "ContactPreference" NOT NULL DEFAULT 'IN_APP',
    "status" "TeammateRequestStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "teammate_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "GroupRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("groupId","userId")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "CalendarEventType" NOT NULL,
    "course" TEXT,
    "location" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "birthday_wishes" (
    "id" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "birthday_wishes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "dedupeKey" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_roll_key" ON "users"("roll");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_studentId_key" ON "student_profiles"("studentId");

-- CreateIndex
CREATE INDEX "student_profiles_fullName_idx" ON "student_profiles"("fullName");

-- CreateIndex
CREATE INDEX "student_profiles_location_idx" ON "student_profiles"("location");

-- CreateIndex
CREATE INDEX "student_profiles_currentOrganization_idx" ON "student_profiles"("currentOrganization");

-- CreateIndex
CREATE INDEX "student_profiles_industry_idx" ON "student_profiles"("industry");

-- CreateIndex
CREATE INDEX "student_profiles_employmentStatus_idx" ON "student_profiles"("employmentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE INDEX "rate_limits_resetAt_idx" ON "rate_limits"("resetAt");

-- CreateIndex
CREATE UNIQUE INDEX "skills_slug_key" ON "skills"("slug");

-- CreateIndex
CREATE INDEX "skills_category_idx" ON "skills"("category");

-- CreateIndex
CREATE INDEX "profile_skills_skillId_idx" ON "profile_skills"("skillId");

-- CreateIndex
CREATE INDEX "announcements_pinned_createdAt_idx" ON "announcements"("pinned", "createdAt");

-- CreateIndex
CREATE INDEX "announcements_category_idx" ON "announcements"("category");

-- CreateIndex
CREATE INDEX "announcements_archived_deletedAt_idx" ON "announcements"("archived", "deletedAt");

-- CreateIndex
CREATE INDEX "events_startsAt_idx" ON "events"("startsAt");

-- CreateIndex
CREATE INDEX "events_deletedAt_idx" ON "events"("deletedAt");

-- CreateIndex
CREATE INDEX "event_attendees_userId_idx" ON "event_attendees"("userId");

-- CreateIndex
CREATE INDEX "posts_createdAt_idx" ON "posts"("createdAt");

-- CreateIndex
CREATE INDEX "posts_authorId_idx" ON "posts"("authorId");

-- CreateIndex
CREATE INDEX "posts_groupId_createdAt_idx" ON "posts"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "posts_type_idx" ON "posts"("type");

-- CreateIndex
CREATE INDEX "comments_postId_createdAt_idx" ON "comments"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "reactions_userId_idx" ON "reactions"("userId");

-- CreateIndex
CREATE INDEX "reports_status_createdAt_idx" ON "reports"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "reports_reporterId_postId_key" ON "reports"("reporterId", "postId");

-- CreateIndex
CREATE UNIQUE INDEX "reports_reporterId_commentId_key" ON "reports"("reporterId", "commentId");

-- CreateIndex
CREATE INDEX "polls_startsAt_idx" ON "polls"("startsAt");

-- CreateIndex
CREATE INDEX "poll_options_pollId_idx" ON "poll_options"("pollId");

-- CreateIndex
CREATE UNIQUE INDEX "poll_ballots_pollId_userId_key" ON "poll_ballots"("pollId", "userId");

-- CreateIndex
CREATE INDEX "poll_votes_optionId_idx" ON "poll_votes"("optionId");

-- CreateIndex
CREATE INDEX "resources_course_idx" ON "resources"("course");

-- CreateIndex
CREATE INDEX "resources_category_idx" ON "resources"("category");

-- CreateIndex
CREATE INDEX "resources_createdAt_idx" ON "resources"("createdAt");

-- CreateIndex
CREATE INDEX "opportunities_deadline_idx" ON "opportunities"("deadline");

-- CreateIndex
CREATE INDEX "opportunities_type_idx" ON "opportunities"("type");

-- CreateIndex
CREATE INDEX "achievements_status_createdAt_idx" ON "achievements"("status", "createdAt");

-- CreateIndex
CREATE INDEX "achievements_userId_idx" ON "achievements"("userId");

-- CreateIndex
CREATE INDEX "projects_category_idx" ON "projects"("category");

-- CreateIndex
CREATE INDEX "projects_createdAt_idx" ON "projects"("createdAt");

-- CreateIndex
CREATE INDEX "project_images_projectId_idx" ON "project_images"("projectId");

-- CreateIndex
CREATE INDEX "project_members_userId_idx" ON "project_members"("userId");

-- CreateIndex
CREATE INDEX "teammate_requests_status_createdAt_idx" ON "teammate_requests"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "groups_slug_key" ON "groups"("slug");

-- CreateIndex
CREATE INDEX "group_members_userId_idx" ON "group_members"("userId");

-- CreateIndex
CREATE INDEX "calendar_events_startsAt_idx" ON "calendar_events"("startsAt");

-- CreateIndex
CREATE INDEX "birthday_wishes_toUserId_year_idx" ON "birthday_wishes"("toUserId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "birthday_wishes_fromUserId_toUserId_year_key" ON "birthday_wishes"("fromUserId", "toUserId", "year");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_createdAt_idx" ON "notifications"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_userId_dedupeKey_key" ON "notifications"("userId", "dedupeKey");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "privacy_settings" ADD CONSTRAINT "privacy_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_skills" ADD CONSTRAINT "profile_skills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_skills" ADD CONSTRAINT "profile_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polls" ADD CONSTRAINT "polls_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_ballots" ADD CONSTRAINT "poll_ballots_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_ballots" ADD CONSTRAINT "poll_ballots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_ballotId_fkey" FOREIGN KEY ("ballotId") REFERENCES "poll_ballots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_postedById_fkey" FOREIGN KEY ("postedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_bookmarks" ADD CONSTRAINT "opportunity_bookmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_bookmarks" ADD CONSTRAINT "opportunity_bookmarks_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_images" ADD CONSTRAINT "project_images_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_likes" ADD CONSTRAINT "project_likes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_likes" ADD CONSTRAINT "project_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_bookmarks" ADD CONSTRAINT "project_bookmarks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_bookmarks" ADD CONSTRAINT "project_bookmarks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teammate_requests" ADD CONSTRAINT "teammate_requests_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "birthday_wishes" ADD CONSTRAINT "birthday_wishes_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "birthday_wishes" ADD CONSTRAINT "birthday_wishes_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
