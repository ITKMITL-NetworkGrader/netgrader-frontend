export interface User {
    u_id: string;
    fullName: string;
    first_name: string;
    last_name: string;
    role: "STUDENT" | "INSTRUCTOR";
}
export interface NavBar {
    isOpen: boolean;
}

export const useUserState = () =>
  useState<User | undefined | null>("user-state", () => null);
export const useNavBarState = () =>
  useState<NavBar | undefined | null>("navbar-state", () => {
    return { isOpen: false };
});