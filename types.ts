export interface Subject {
  code: string;
  name: string;
  phase: number;
  /**
   * Prerequisites Logic:
   * The outer array represents OR logic.
   * The inner array represents AND logic.
   * Example: [["A", "B"], ["C"]] means (A AND B) OR C.
   */
  prerequisites: string[][];
  hours: number; // Class hours (H/A)
  credits?: number; // Optional
}

export interface CurriculumData {
  [phase: number]: Subject[];
}

export type SubjectStatus = 'completed' | 'available' | 'blocked';

export interface SubjectAnalysis {
  subject: Subject;
  status: SubjectStatus;
  missingPrereqs: string[];
  chainWeight: number; // How many future subjects depend on this one (recursively)
}

export interface Elective {
  id: string;
  name: string;
  hours: number;
  type: 'discipline' | 'complementary';
}

export interface UserSession {
  username: string;
  completedCodes: string[];
  electives: Elective[];
  lastLogin: Date;
}