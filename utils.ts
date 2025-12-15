import { Subject, SubjectStatus, SubjectAnalysis } from './types';
import { CURRICULUM, MAX_WEEKLY_HOURS, WEEKS_PER_SEMESTER, REQUIRED_ELECTIVE_HOURS } from './constants';

export const getSubjectsByPhase = (phase: number): Subject[] => {
  return CURRICULUM.filter((s) => s.phase === phase);
};

export const getSubjectByCode = (code: string): Subject | undefined => {
  return CURRICULUM.find((s) => s.code === code);
};

// --- Recommendation Logic ---
// We need to know: "If I finish X, what depends on X?"
const DEPENDENCY_MAP = new Map<string, string[]>();

// Initialize dependency map (Who depends on whom?)
CURRICULUM.forEach(subject => {
  // Flatten prereqs to get a unique list of direct requirements
  const directPrereqs = new Set(subject.prerequisites.flat());
  directPrereqs.forEach(prereqCode => {
    if (!DEPENDENCY_MAP.has(prereqCode)) {
      DEPENDENCY_MAP.set(prereqCode, []);
    }
    DEPENDENCY_MAP.get(prereqCode)?.push(subject.code);
  });
});

// Recursive function to count total downstream blocked subjects
export const calculateChainWeight = (code: string, visited = new Set<string>()): number => {
  if (visited.has(code)) return 0;
  visited.add(code);

  const dependents = DEPENDENCY_MAP.get(code) || [];
  let weight = dependents.length; // Direct dependents

  dependents.forEach(depCode => {
    weight += calculateChainWeight(depCode, visited);
  });

  return weight;
};

export const analyzeSubject = (
  subject: Subject,
  completedCodes: Set<string>
): SubjectAnalysis => {
  // Chain Weight Calculation
  // We only care about the weight if we haven't done it yet
  const chainWeight = calculateChainWeight(subject.code);

  // If already done
  if (completedCodes.has(subject.code)) {
    return { subject, status: 'completed', missingPrereqs: [], chainWeight };
  }

  // If no prereqs, it's available
  if (subject.prerequisites.length === 0) {
    return { subject, status: 'available', missingPrereqs: [], chainWeight };
  }

  // Check Prereqs Logic: (Group A) OR (Group B)
  // Inside Group A: Item 1 AND Item 2
  
  let isUnlocked = false;
  const missingInBestGroup: string[] = [];

  for (const group of subject.prerequisites) {
    const missingInGroup = group.filter((code) => !completedCodes.has(code));
    
    if (missingInGroup.length === 0) {
      isUnlocked = true;
      break; 
    } else {
      // Store missing items to show user if they can't take it
      if (missingInBestGroup.length === 0) {
        missingInBestGroup.push(...missingInGroup);
      }
    }
  }

  return {
    subject,
    status: isUnlocked ? 'available' : 'blocked',
    missingPrereqs: isUnlocked ? [] : missingInBestGroup,
    chainWeight
  };
};

export const analyzeAll = (completedCodes: Set<string>): Record<number, SubjectAnalysis[]> => {
  const result: Record<number, SubjectAnalysis[]> = {};

  // Initialize all phases
  for (let i = 1; i <= 10; i++) {
    result[i] = [];
  }

  CURRICULUM.forEach((subject) => {
    const analysis = analyzeSubject(subject, completedCodes);
    result[subject.phase].push(analysis);
  });

  return result;
};

/**
 * Simulates future semesters to determine minimum time to graduation.
 * Respects Prerequisites, MAX_WEEKLY_HOURS, and ELECTIVE HOURS.
 */
export const calculateMinimumSemesters = (currentCompleted: Set<string>, completedElectiveHours: number): number => {
  let semesters = 0;
  const tempCompleted = new Set(currentCompleted);
  const totalSubjectsCount = CURRICULUM.length;
  let remainingElectiveHours = Math.max(0, REQUIRED_ELECTIVE_HOURS - completedElectiveHours);
  
  // Safety break
  let loopSafety = 0;
  
  // Loop until all mandatory subjects are done
  while (tempCompleted.size < totalSubjectsCount && loopSafety < 30) {
    loopSafety++;
    semesters++;

    // 1. Find all currently available subjects in this simulation step
    const available: { subject: Subject, weight: number }[] = [];
    
    for (const sub of CURRICULUM) {
      if (tempCompleted.has(sub.code)) continue;

      let isUnlocked = false;
      if (sub.prerequisites.length === 0) {
        isUnlocked = true;
      } else {
        for (const group of sub.prerequisites) {
          if (group.every(p => tempCompleted.has(p))) {
            isUnlocked = true;
            break;
          }
        }
      }

      if (isUnlocked) {
        available.push({ 
          subject: sub, 
          weight: calculateChainWeight(sub.code) 
        });
      }
    }

    if (available.length === 0 && tempCompleted.size < totalSubjectsCount) {
      break; // Deadlock
    }

    // 2. Sort by Priority
    available.sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return a.subject.phase - b.subject.phase;
    });

    // 3. Fill the semester bucket
    let currentWeeklyLoad = 0;
    const takenThisSemester: string[] = [];

    for (const item of available) {
      const weeklyHours = item.subject.hours / WEEKS_PER_SEMESTER;
      const effectiveLoad = item.subject.hours > 200 ? MAX_WEEKLY_HOURS : weeklyHours;

      if (currentWeeklyLoad + effectiveLoad <= MAX_WEEKLY_HOURS) {
        currentWeeklyLoad += effectiveLoad;
        takenThisSemester.push(item.subject.code);
      }
    }

    // 4. Check for spare capacity for electives
    // Capacity in hours/semester = 30 hours/week * 18 weeks = 540 hours
    // But we count load in weekly hours.
    // Spare weekly hours = MAX - currentWeeklyLoad
    // Spare total hours approx = (MAX - current) * 18
    const spareWeeklyHours = MAX_WEEKLY_HOURS - currentWeeklyLoad;
    if (remainingElectiveHours > 0 && spareWeeklyHours > 0) {
        const spareTotalHours = spareWeeklyHours * WEEKS_PER_SEMESTER;
        remainingElectiveHours -= spareTotalHours;
        if (remainingElectiveHours < 0) remainingElectiveHours = 0;
    }

    // 5. Mark as done
    takenThisSemester.forEach(code => tempCompleted.add(code));
    if (takenThisSemester.length === 0 && remainingElectiveHours > 0) {
        // Only electives left in this step?
        // This condition is tricky, usually handled by outer loop, 
        // but if no mandatories are available (all done) we break loop
        break; 
    }
    if (takenThisSemester.length === 0) break;
  }

  // If we finished mandatory subjects but still have elective hours
  if (remainingElectiveHours > 0) {
      const hoursPerSemester = MAX_WEEKLY_HOURS * WEEKS_PER_SEMESTER;
      const extraSemesters = Math.ceil(remainingElectiveHours / hoursPerSemester);
      semesters += extraSemesters;
  }

  return semesters;
};