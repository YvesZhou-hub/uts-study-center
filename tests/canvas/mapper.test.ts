import { describe, expect, it } from "vitest";
import { mapCanvasAssignment, mapCanvasCourse } from "@/integrations/canvas/mapper";

describe("Canvas DTO mapping", () => {
  it("maps external course fields into a provider-independent subject", () => {
    const subject = mapCanvasCourse({
      id: 123,
      name: "41082 Introduction to Data Engineering",
      course_code: "41082",
      html_url: "https://canvas.example.edu/courses/123",
    });
    expect(subject).toMatchObject({
      id: "canvas-subject-123",
      provider: "canvas",
      externalId: "123",
      code: "41082",
      name: "41082 Introduction to Data Engineering",
    });
  });

  it("maps submission state without leaking Canvas DTO shape", () => {
    const subject = mapCanvasCourse({ id: 123, name: "Web Systems", course_code: "31268" });
    const assignment = mapCanvasAssignment(
      {
        id: 456,
        name: "REST API Project",
        due_at: "2026-09-01T13:59:00Z",
        points_possible: 30,
        submission: { workflow_state: "submitted", submitted_at: "2026-08-29T01:00:00Z" },
      },
      subject,
    );
    expect(assignment).toMatchObject({
      id: "canvas-assessment-456",
      subjectId: "canvas-subject-123",
      officialStatus: "SUBMITTED",
      workflowStatus: "SUBMITTED",
      completion: 100,
    });
  });
});
