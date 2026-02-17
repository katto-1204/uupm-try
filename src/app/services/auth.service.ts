import { Injectable, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface User {
    id: string;
    username: string;
    fullName: string;
    passwordHash: string;
}

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    private platformId = inject(PLATFORM_ID);
    private isBrowser = isPlatformBrowser(this.platformId);

    private users = signal<User[]>(this.loadUsers());
    private currentUser = signal<User | null>(this.loadSession());

    public loggedInUser = computed(() => this.currentUser());

    constructor() { }

    private loadUsers(): User[] {
        if (!this.isBrowser) return [];
        const data = localStorage.getItem('fb_users');
        return data ? JSON.parse(data) : [];
    }

    private loadSession(): User | null {
        if (!this.isBrowser) return null;
        const data = localStorage.getItem('fb_session');
        return data ? JSON.parse(data) : null;
    }

    private saveUsers(users: User[]) {
        if (!this.isBrowser) return;
        localStorage.setItem('fb_users', JSON.stringify(users));
    }

    private saveSession(user: User | null) {
        if (!this.isBrowser) return;
        if (user) {
            localStorage.setItem('fb_session', JSON.stringify(user));
        } else {
            localStorage.removeItem('fb_session');
        }
    }

    async hashPassword(password: string): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    async register(username: string, password: string, fullName: string): Promise<boolean> {
        const users = this.users();
        if (users.find((u: User) => u.username === username)) {
            return false; // User already exists
        }

        const passwordHash = await this.hashPassword(password);
        const newUser: User = {
            id: crypto.randomUUID(),
            username,
            fullName,
            passwordHash
        };

        const updatedUsers = [...users, newUser];
        this.users.set(updatedUsers);
        this.saveUsers(updatedUsers);
        return true;
    }

    async login(username: string, password: string): Promise<boolean> {
        const users = this.users();
        const user = users.find((u: User) => u.username === username);
        if (!user) return false;

        const passwordHash = await this.hashPassword(password);
        if (user.passwordHash === passwordHash) {
            this.currentUser.set(user);
            this.saveSession(user);
            return true;
        }
        return false;
    }

    logout() {
        this.currentUser.set(null);
        this.saveSession(null);
    }
}
