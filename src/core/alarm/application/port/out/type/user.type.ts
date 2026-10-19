export interface User {
    id: string;
    name: string;
    phone: string;
}

export interface UserPage {
    users: User[];
    nextCursor: string | null;
}
