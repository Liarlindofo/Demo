export interface User {
  id: string;
  email: string;
  username: string;
  password: string;
  fullName: string;
  cnpj: string;
  birthDate: string;
  isAdmin: boolean;
  createdAt: Date;
}

export class UserService {
  private static readonly USERS_KEY = 'drin_users';

  // Salvar usuário no localStorage
  static saveUser(user: Omit<User, 'id' | 'createdAt'>): User {
    const users = this.getAllUsers();
    
    // Verificar se email já existe
    const existingUser = users.find(u => u.email === user.email);
    if (existingUser) {
      throw new Error('Este email já está cadastrado');
    }

    // Verificar se CNPJ já existe
    const existingCNPJ = users.find(u => u.cnpj === user.cnpj);
    if (existingCNPJ) {
      throw new Error('Este CNPJ já está cadastrado');
    }

    const newUser: User = {
      ...user,
      id: this.generateId(),
      createdAt: new Date()
    };

    users.push(newUser);
    this.saveUsers(users);
    
    return newUser;
  }

  // Buscar usuário por email
  static getUserByEmail(email: string): User | null {
    const users = this.getAllUsers();
    return users.find(user => user.email === email) || null;
  }

  // Buscar usuário por email ou username
  static getUserByEmailOrUsername(emailOrUsername: string): User | null {
    const users = this.getAllUsers();
    return users.find(user => 
      user.email === emailOrUsername || 
      user.username === emailOrUsername
    ) || null;
  }

  // Validar credenciais de login
  static validateCredentials(emailOrUsername: string, password: string): User | null {
    const user = this.getUserByEmailOrUsername(emailOrUsername);
    
    if (!user) {
      return null;
    }

    // Comparar senhas (em produção, use bcrypt)
    if (user.password !== password) {
      return null;
    }

    return user;
  }

  // Obter todos os usuários
  static getAllUsers(): User[] {
    try {
      const users = localStorage.getItem(this.USERS_KEY);
      return users ? JSON.parse(users) : [];
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      return [];
    }
  }

  // Criar usuário administrador padrão
  static createDefaultAdmin(): void {
    const users = this.getAllUsers();
    const adminExists = users.find(u => u.isAdmin);
    
    if (!adminExists) {
      const admin: Omit<User, 'id' | 'createdAt'> = {
        email: 'admin@drin.com',
        username: 'DrinAdmin2157',
        password: '21571985',
        fullName: 'Administrador Drin',
        cnpj: '00.000.000/0001-00',
        birthDate: '1985-01-01',
        isAdmin: true
      };
      
      this.saveUser(admin);
    }
  }

  // Exportar dados dos usuários
  static exportUsers(): string {
    const users = this.getAllUsers();
    return JSON.stringify(users, null, 2);
  }

  // Importar dados dos usuários
  static importUsers(jsonData: string): boolean {
    try {
      const users = JSON.parse(jsonData);
      if (Array.isArray(users)) {
        this.saveUsers(users);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao importar usuários:', error);
      return false;
    }
  }

  // Limpar todos os usuários (apenas para desenvolvimento)
  static clearAllUsers(): void {
    localStorage.removeItem(this.USERS_KEY);
  }

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private static saveUsers(users: User[]): void {
    try {
      localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
    } catch (error) {
      console.error('Erro ao salvar usuários:', error);
    }
  }
}

export default UserService;
