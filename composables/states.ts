import type { PlayNode, Connection } from '@/types/play'

export interface User {
    u_id: string;
    fullName: string;
    role: "STUDENT" | "INSTRUCTOR" | "ADMIN"; // Global Role
    lastLogin?: string;
    iat?: number;
    exp?: number;
}

export interface CourseRole {
    courseId: string;
    isEnrolled: boolean;
    role: "STUDENT" | "INSTRUCTOR" | "TA"; // Course Role
    enrollmentDate: string;
}

export interface Enrollment {
    u_id: string;
    c_id: string;
    u_role: "STUDENT" | "INSTRUCTOR" | "TA";
    enrollmentDate: string;
    fullName: string;
}

export interface NavBar {
    isOpen: boolean;
}

export interface PlayState {
    nodes: PlayNode[]
    connections: Connection[]
    selectedNodeId: string | null
}

export const useUserState = () =>
  useState<User | undefined | null>("user-state", () => null);

export const useCourseRoleState = () =>
  useState<CourseRole | undefined | null>("course-role-state", () => null);

export const useNavBarState = () =>
  useState<NavBar | undefined | null>("navbar-state", () => {
    return { isOpen: false };
});

export const usePlayState = (playId?: string) => {
  const stateKey = `play-state-${playId || 'default'}`
  return useState<PlayState>(stateKey, () => ({
    nodes: [
      {
        id: 'grader-1',
        type: 'grader',
        name: 'Grader',
        position: { x: 100, y: 100 },
        interfaces: [
          {
            id: 'grader-int-1',
            name: 'Control',
            type: 'ethernet',
            status: 'up'
          }
        ]
      }
    ],
    connections: [],
    selectedNodeId: null
  }))
}