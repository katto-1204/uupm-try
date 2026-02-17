import { Component, inject, signal, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from './services/auth.service';
import { BankingService, Account, AccountType } from './services/banking.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  auth = inject(AuthService);
  banking = inject(BankingService);

  view = signal<'login' | 'register' | 'dashboard' | 'account-create' | 'account-edit' | 'transactions'>('login');

  // Auth Form State
  loginUsername = signal('');
  loginPassword = signal('');
  regUsername = signal('');
  regPassword = signal('');
  regFullName = signal('');

  // Account Form State
  activeAccountId = signal<string | null>(null);
  accountFullName = signal('');
  accountDOB = signal('');
  accountAddress = signal('');
  accountPhone = signal('');
  accountEmail = signal('');
  accountType = signal<AccountType>('savings');

  // Transaction Form State
  transAmount = signal(0);
  transDesc = signal('');
  transTargetId = signal('');

  selectedAccount = computed(() =>
    this.banking.allAccounts().find(a => a.id === this.activeAccountId()) || null
  );

  userAccounts = computed(() => {
    const user = this.auth.loggedInUser();
    return user ? this.banking.allAccounts().filter((a: Account) => a.ownerId === user.id) : [];
  });

  constructor() {
    if (this.auth.loggedInUser()) {
      this.view.set('dashboard');
    }
  }

  async handleLogin() {
    const success = await this.auth.login(this.loginUsername(), this.loginPassword());
    if (success) {
      this.view.set('dashboard');
      this.loginUsername.set('');
      this.loginPassword.set('');
    } else {
      alert('Invalid credentials');
    }
  }

  async handleRegister() {
    const success = await this.auth.register(this.regUsername(), this.regPassword(), this.regFullName());
    if (success) {
      alert('Registration successful! Please login.');
      this.view.set('login');
    } else {
      alert('Registration failed (username might be taken)');
    }
  }

  handleLogout() {
    this.auth.logout();
    this.view.set('login');
  }

  saveAccount() {
    const user = this.auth.loggedInUser();
    if (!user) return;

    const data = {
      ownerId: user.id,
      fullName: this.accountFullName(),
      dateOfBirth: this.accountDOB(),
      address: this.accountAddress(),
      contactNumber: this.accountPhone(),
      email: this.accountEmail(),
      accountType: this.accountType()
    };

    if (this.activeAccountId()) {
      this.banking.updateAccount(this.activeAccountId()!, data);
    } else {
      this.banking.createAccount(data);
    }

    this.view.set('dashboard');
    this.resetAccountForm();
  }

  editAccount(account: Account) {
    this.activeAccountId.set(account.id);
    this.accountFullName.set(account.fullName);
    this.accountDOB.set(account.dateOfBirth);
    this.accountAddress.set(account.address);
    this.accountPhone.set(account.contactNumber);
    this.accountEmail.set(account.email);
    this.accountType.set(account.accountType);
    this.view.set('account-edit');
  }

  deleteAccount(id: string) {
    if (confirm('Are you sure you want to delete this account?')) {
      this.banking.deleteAccount(id);
    }
  }

  resetAccountForm() {
    this.activeAccountId.set(null);
    this.accountFullName.set('');
    this.accountDOB.set('');
    this.accountAddress.set('');
    this.accountPhone.set('');
    this.accountEmail.set('');
    this.accountType.set('savings');
  }

  handleTransaction(type: 'deposit' | 'withdraw' | 'transfer') {
    const id = this.activeAccountId();
    if (!id) return;

    try {
      if (type === 'deposit') {
        this.banking.deposit(id, this.transAmount(), this.transDesc());
      } else if (type === 'withdraw') {
        this.banking.withdraw(id, this.transAmount(), this.transDesc());
      } else if (type === 'transfer') {
        this.banking.transfer(id, this.transTargetId(), this.transAmount(), this.transDesc());
      }
      this.transAmount.set(0);
      this.transDesc.set('');
      this.transTargetId.set('');
      alert('Transaction successful!');
    } catch (e: any) {
      alert(e.message);
    }
  }
}
