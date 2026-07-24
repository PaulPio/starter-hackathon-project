import { z } from "zod";

export const ProjectSchema = z.object({
  name: z.string(),
  url: z.string().nullable(),
  bullets: z.array(z.string()),
  technologies: z.array(z.string()).default([]),
});
export type Project = z.infer<typeof ProjectSchema>;

export const ResumeProfileSchema = z.object({
  name: z.string().nullable(),
  contact: z.object({
    email: z.string().nullable(),
    phone: z.string().nullable(),
    linkedin: z.string().nullable(),
    github: z.string().nullable(),
  }),
  skills: z.array(z.string()),
  experienceLevel: z.enum([
    "student",
    "intern",
    "new-grad",
    "junior",
    "mid",
    "senior",
  ]),
  education: z.array(
    z.object({
      school: z.string(),
      degree: z.string().nullable(),
      field: z.string().nullable(),
      gradDate: z.string().nullable(),
    })
  ),
  workExperience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      bullets: z.array(z.string()),
    })
  ),
  projects: z.array(ProjectSchema).default([]),
  targetRoles: z.array(z.string()),
  healthCheck: z.object({
    overallScore: z.number().min(0).max(100),
    missingSections: z.array(z.string()),
    weakBullets: z.array(
      z.object({
        text: z.string(),
        reason: z.string(),
      })
    ),
    summary: z.string(),
  }),
});
export type ResumeProfile = z.infer<typeof ResumeProfileSchema>;

export const JobListingSchema = z.object({
  id: z.string(),
  company: z.string(),
  position: z.string(),
  location: z.string(),
  salary: z.string().nullable(),
  link: z.string(),
  age: z.string(),
  category: z.string(),
});
export type JobListing = z.infer<typeof JobListingSchema>;

export const RankedJobSchema = JobListingSchema.extend({
  fitScore: z.number().min(0).max(100).nullable(),
  why: z.string().nullable(),
  matchedSkills: z.array(z.string()),
});
export type RankedJob = z.infer<typeof RankedJobSchema>;

// What we ask Gemma to return for a batch of jobs — kept minimal (id + scoring
// fields only) so the model doesn't have to echo back the full job object.
export const RankingResponseSchema = z.object({
  rankings: z.array(
    z.object({
      id: z.string(),
      fitScore: z.number().min(0).max(100),
      why: z.string(),
      matchedSkills: z.array(z.string()),
    })
  ),
});
export type RankingResponse = z.infer<typeof RankingResponseSchema>;

const BulletDiffSchema = z.object({
  original: z.string(),
  tailored: z.string(),
  reason: z.string(),
});

export const TailorResponseSchema = z.object({
  tailoredSummary: z.string(),
  tailoredBullets: z.array(BulletDiffSchema),
  tailoredProjects: z
    .array(
      z.object({
        name: z.string(),
        url: z.string().nullable(),
        bullets: z.array(BulletDiffSchema),
      })
    )
    .default([]),
  // Names of resume projects to KEEP, in display order. Omit a name to drop it
  // from the one-page PDF (swap/reorder by changing this list's order).
  projectOrder: z.array(z.string()).default([]),
  removedProjects: z
    .array(
      z.object({
        name: z.string(),
        reason: z.string(),
      })
    )
    .default([]),
  // Reorder / drop skills from the candidate's existing list only — never invent.
  tailoredSkills: z.array(z.string()).default([]),
  skillsReason: z.string().default(""),
  addedGithubProjects: z
    .array(
      z.object({
        name: z.string(),
        url: z.string(),
        bullets: z.array(z.string()),
        technologies: z.array(z.string()),
        reason: z.string(),
      })
    )
    .default([]),
});
export type TailorResponse = z.infer<typeof TailorResponseSchema>;

export const ResumePdfDataSchema = z.object({
  name: z.string().nullable(),
  contact: z.object({
    email: z.string().nullable(),
    phone: z.string().nullable(),
    linkedin: z.string().nullable(),
    github: z.string().nullable(),
  }),
  tailoredSummary: z.string(),
  skills: z.array(z.string()),
  education: z.array(
    z.object({
      school: z.string(),
      degree: z.string().nullable(),
      field: z.string().nullable(),
      gradDate: z.string().nullable(),
    })
  ),
  experience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      bullets: z.array(z.string()),
    })
  ),
  projects: z.array(ProjectSchema).default([]),
  targetJobLabel: z.string(),
});
export type ResumePdfData = z.infer<typeof ResumePdfDataSchema>;
