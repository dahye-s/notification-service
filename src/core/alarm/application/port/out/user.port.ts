import { User, UserPage } from './type/user.type';

export const USER_PORT = Symbol('UserPort');

export interface UserPort {
    fetchPage(cursor: string | null, limit: number): Promise<UserPage>;
}
