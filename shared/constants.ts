// Department constants shared across the application
export const departments = [
  "Computer Science",
  "Electronics", 
  "Mechanical",
  "Civil",
  "Electrical", 
  "Chemical",
  "Information Technology",
  "Biotechnology",
  "Mathematics",
  "Physics",
  "Chemistry",
  "AIDS", // Artificial Intelligence and Data Science
  "AIML"  // Artificial Intelligence and Machine Learning
] as const;

export type Department = typeof departments[number];