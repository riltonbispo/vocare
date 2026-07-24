export type CurriculumFileDescriptor = {
  readonly name: string;
  readonly type: string;
};

export type CurriculumFileKind = "pdf" | "text" | "unsupported";

export const CURRICULUM_FILE_ACCEPT =
  ".pdf,.md,.markdown,.txt,application/pdf,text/markdown,text/plain";

export function classifyCurriculumFile({
  name,
  type,
}: CurriculumFileDescriptor): CurriculumFileKind {
  if (type === "application/pdf" || name.toLowerCase().endsWith(".pdf")) {
    return "pdf";
  }

  if (
    type === "text/markdown" ||
    type === "text/plain" ||
    /\.(md|markdown|txt)$/i.test(name)
  ) {
    return "text";
  }

  return "unsupported";
}
