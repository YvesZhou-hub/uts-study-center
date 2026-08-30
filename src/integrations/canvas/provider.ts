import type {
  Announcement,
  Assessment,
  Subject,
  SubjectModule,
} from "@/domain/academic/types";
import { CanvasClient } from "./client";
import {
  mapCanvasAnnouncement,
  mapCanvasAssignment,
  mapCanvasCourse,
  mapCanvasModule,
} from "./mapper";
import type {
  CanvasAssignmentDto,
  CanvasCourseDto,
  CanvasDiscussionTopicDto,
  CanvasFileDto,
  CanvasModuleDto,
  CanvasUserDto,
} from "./types";

export interface ProviderUser {
  externalId: string;
  name: string;
}

export interface ProviderFile {
  externalId: string;
  name: string;
  url: string;
  contentType?: string;
}

export interface CanvasProvider {
  readonly name: "canvas" | "mock";
  getCurrentUser(): Promise<ProviderUser>;
  getCourses(): Promise<Subject[]>;
  getAssignments(subject: Subject): Promise<Assessment[]>;
  getModules(subject: Subject): Promise<SubjectModule[]>;
  getAnnouncements(subjects: Subject[]): Promise<Announcement[]>;
  getFiles(subject: Subject): Promise<ProviderFile[]>;
}

export class RestCanvasProvider implements CanvasProvider {
  readonly name = "canvas" as const;

  constructor(private readonly client: CanvasClient) {}

  async getCurrentUser(): Promise<ProviderUser> {
    const user = await this.client.get<CanvasUserDto>("users/self");
    return { externalId: String(user.id), name: user.name };
  }

  async getCourses(): Promise<Subject[]> {
    const courses = await this.client.getAll<CanvasCourseDto>("courses", {
      enrollment_state: "active",
      state: "available",
    });
    return courses.map(mapCanvasCourse);
  }

  async getAssignments(subject: Subject): Promise<Assessment[]> {
    const assignments = await this.client.getAll<CanvasAssignmentDto>(
      `courses/${subject.externalId}/assignments`,
      { "include[]": "submission" },
    );
    return assignments.map((assignment) => mapCanvasAssignment(assignment, subject));
  }

  async getModules(subject: Subject): Promise<SubjectModule[]> {
    const modules = await this.client.getAll<CanvasModuleDto>(
      `courses/${subject.externalId}/modules`,
      { "include[]": "items" },
    );
    return modules.map((module) => mapCanvasModule(module, subject.id));
  }

  async getAnnouncements(subjects: Subject[]): Promise<Announcement[]> {
    if (subjects.length === 0) return [];
    const announcements = await this.client.getAll<CanvasDiscussionTopicDto>("announcements", {
      "context_codes[]": subjects.map((subject) => `course_${subject.externalId}`),
    });
    const byExternalId = new Map(subjects.map((subject) => [subject.externalId, subject]));
    return announcements.flatMap((announcement) => {
      const externalSubjectId = announcement.context_code?.replace("course_", "");
      const subject = externalSubjectId ? byExternalId.get(externalSubjectId) : undefined;
      return subject ? [mapCanvasAnnouncement(announcement, subject)] : [];
    });
  }

  async getFiles(subject: Subject): Promise<ProviderFile[]> {
    const files = await this.client.getAll<CanvasFileDto>(`courses/${subject.externalId}/files`);
    return files.map((file) => ({
      externalId: String(file.id),
      name: file.display_name,
      url: file.url,
      contentType: file.content_type,
    }));
  }
}
