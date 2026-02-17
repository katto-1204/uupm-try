import { Injectable, signal, computed } from '@angular/core';

export type AccountType = 'savings' | 'checking';

export interface Transaction {
    id: string;
    accountId: string;
    type: 'deposit' | 'withdrawal' | 'transfer';
    amount: number;
    date: Date;
    description: string;
    targetAccountId?: string;
}

export interface Account {
    id: string;
    ownerId: string;
    fullName: string;
    dateOfBirth: string;
    address: string;
    contactNumber: string;
    email: string;
    accountType: AccountType;
    balance: number;
    createdAt: Date;
}

@Injectable({
    providedIn: 'root'
})
export class BankingService {
    private accounts = signal<Account[]>(this.loadAccounts());
    private transactions = signal<Transaction[]>(this.loadTransactions());

    public allAccounts = computed(() => this.accounts());

    constructor() { }

    private loadAccounts(): Account[] {
        const data = localStorage.getItem('fb_accounts');
        return data ? JSON.parse(data) : [];
    }

    private loadTransactions(): Transaction[] {
        const data = localStorage.getItem('fb_transactions');
        return data ? JSON.parse(data) : [];
    }

    private save() {
        localStorage.setItem('fb_accounts', JSON.stringify(this.accounts()));
        localStorage.setItem('fb_transactions', JSON.stringify(this.transactions()));
    }

    getAccountsByOwner(ownerId: string) {
        return computed(() => this.accounts().filter((a: Account) => a.ownerId === ownerId));
    }

    getTransactionsByAccount(accountId: string) {
        return computed(() => this.transactions().filter((t: Transaction) => t.accountId === accountId || t.targetAccountId === accountId));
    }

    createAccount(accountData: Omit<Account, 'id' | 'balance' | 'createdAt'>): Account {
        const newAccount: Account = {
            ...accountData,
            id: Math.random().toString(36).substring(2, 9).toUpperCase(),
            balance: 0,
            createdAt: new Date()
        };

        const updated = [...this.accounts(), newAccount];
        this.accounts.set(updated);
        this.save();
        return newAccount;
    }

    updateAccount(accountId: string, updates: Partial<Account>) {
        const updated = this.accounts().map((a: Account) =>
            a.id === accountId ? { ...a, ...updates } : a
        );
        this.accounts.set(updated);
        this.save();
    }

    deleteAccount(accountId: string) {
        const updated = this.accounts().filter((a: Account) => a.id !== accountId);
        this.accounts.set(updated);
        this.save();
    }

    deposit(accountId: string, amount: number, description: string = 'Deposit') {
        if (amount <= 0) throw new Error('Amount must be positive');

        const accounts = this.accounts();
        const accountIndex = accounts.findIndex(a => a.id === accountId);
        if (accountIndex === -1) throw new Error('Account not found');

        const updatedAccounts = [...accounts];
        updatedAccounts[accountIndex] = {
            ...updatedAccounts[accountIndex],
            balance: updatedAccounts[accountIndex].balance + amount
        };

        const transaction: Transaction = {
            id: crypto.randomUUID(),
            accountId,
            type: 'deposit',
            amount,
            date: new Date(),
            description
        };

        this.accounts.set(updatedAccounts);
        this.transactions.set([...this.transactions(), transaction]);
        this.save();
    }

    withdraw(accountId: string, amount: number, description: string = 'Withdrawal') {
        if (amount <= 0) throw new Error('Amount must be positive');

        const accounts = this.accounts();
        const accountIndex = accounts.findIndex(a => a.id === accountId);
        if (accountIndex === -1) throw new Error('Account not found');

        if (accounts[accountIndex].balance < amount) {
            throw new Error('Insufficient funds');
        }

        const updatedAccounts = [...accounts];
        updatedAccounts[accountIndex] = {
            ...updatedAccounts[accountIndex],
            balance: updatedAccounts[accountIndex].balance - amount
        };

        const transaction: Transaction = {
            id: crypto.randomUUID(),
            accountId,
            type: 'withdrawal',
            amount,
            date: new Date(),
            description
        };

        this.accounts.set(updatedAccounts);
        this.transactions.set([...this.transactions(), transaction]);
        this.save();
    }

    transfer(fromAccountId: string, toAccountId: string, amount: number, description: string = 'Transfer') {
        if (amount <= 0) throw new Error('Amount must be positive');
        if (fromAccountId === toAccountId) throw new Error('Cannot transfer to the same account');

        const accounts = this.accounts();
        const fromIndex = accounts.findIndex((a: Account) => a.id === fromAccountId);
        const toIndex = accounts.findIndex((a: Account) => a.id === toAccountId);

        if (fromIndex === -1 || toIndex === -1) throw new Error('Account not found');
        if (accounts[fromIndex].balance < amount) throw new Error('Insufficient funds');

        const updatedAccounts = [...accounts];
        updatedAccounts[fromIndex] = { ...updatedAccounts[fromIndex], balance: updatedAccounts[fromIndex].balance - amount };
        updatedAccounts[toIndex] = { ...updatedAccounts[toIndex], balance: updatedAccounts[toIndex].balance + amount };

        const transaction: Transaction = {
            id: crypto.randomUUID(),
            accountId: fromAccountId,
            targetAccountId: toAccountId,
            type: 'transfer',
            amount,
            date: new Date(),
            description
        };

        this.accounts.set(updatedAccounts);
        this.transactions.set([...this.transactions(), transaction]);
        this.save();
    }
}
