# OrderSistem - Guia do Usuário

## 🚀 Primeiros Passos

### Login Inicial do Administrador

Para acessar o sistema pela primeira vez, você precisa criar a conta de administrador:

1. Acesse a tela de login
2. **IMPORTANTE**: Você precisa se registrar primeiro. Como o sistema está configurado com auto-confirmação de email, você pode:
   - Clicar em "Criar Conta" (funcionalidade a ser implementada)
   - Ou usar o backend do Lovable Cloud para criar o usuário admin

3. Use as seguintes credenciais para o admin:
   - **Email**: ordersistem@tecnobook.com
   - **Senha**: @order1234

4. Quando este email se registrar, automaticamente receberá privilégios de administrador

## 📱 Navegação

O sistema possui um **menu fixo no rodapé** com 5 seções principais:

- **Início**: Tela principal com atalhos rápidos e estatísticas
- **Clientes**: Gerenciamento de clientes
- **Marcas**: Gerenciamento de marcas e modelos
- **Usuários**: Gerenciamento de usuários (apenas admin)
- **Perfil**: Configurações da conta

## 👤 Tipos de Usuário

### Administrador
- Acesso completo ao sistema
- Pode criar e gerenciar usuários atendentes
- Pode deletar registros
- Gerenciar todas as funcionalidades

### Atendente
- Pode visualizar e criar ordens de serviço
- Pode gerenciar clientes, marcas e modelos
- Não pode deletar registros
- Não pode acessar gerenciamento de usuários

## 🔧 Funcionalidades Principais

### Tela Inicial
A tela inicial apresenta 4 atalhos rápidos:
- **Nova Ordem**: Criar nova ordem de serviço
- **Checklists**: Acessar checklists de serviço
- **Caixa**: Gerenciar movimentações financeiras
- **Impressora**: Conectar e testar impressora

### Clientes
- Visualizar lista de clientes
- Buscar clientes por nome, email ou telefone
- Adicionar novos clientes
- Ver informações de contato

### Marcas & Modelos
- Gerenciar marcas de equipamentos
- Vincular modelos às marcas
- Buscar por marca
- Visualizar modelos por marca

### Usuários (Admin)
- Criar novos usuários atendentes
- Visualizar todos os usuários do sistema
- Ver roles de cada usuário
- Buscar usuários

### Perfil
- Atualizar nome
- Ver email (não editável)
- Ver role (Admin ou Atendente)
- Sair da conta

## 🎨 Design

O sistema utiliza:
- **Cores**: Laranja mecânico (#FF6B00) e preto forte
- **Fonte**: Montserrat (substituindo Gotham por disponibilidade)
- **Estilo**: Moderno, tecnológico e mobile-first
- **Animações**: Transições suaves e efeitos glow

## 🔐 Segurança

- Autenticação obrigatória
- Roles baseados em banco de dados
- RLS (Row Level Security) ativo em todas as tabelas
- Validação de entrada de dados
- Redirecionamento automático para login

## 📊 Banco de Dados

O sistema gerencia:
- Perfis de usuários
- Roles (Admin/Atendente)
- Clientes
- Marcas
- Modelos
- Ordens de Serviço

## ⚙️ Configurações Backend

O sistema utiliza **Lovable Cloud** para:
- Autenticação de usuários
- Banco de dados PostgreSQL
- Armazenamento seguro
- Auto-confirmação de email (ativo para facilitar testes)

## 📝 Próximos Passos

Para completar o sistema, implemente:
1. Formulários de criação/edição de clientes
2. Formulários de criação/edição de marcas/modelos
3. Sistema completo de ordens de serviço
4. Funcionalidade de checklists
5. Sistema de caixa/financeiro
6. Integração com impressora
7. Relatórios e dashboards

## 🆘 Suporte

Em caso de problemas:
1. Verifique se está logado
2. Confirme suas permissões (Admin ou Atendente)
3. Limpe o cache do navegador
4. Faça logout e login novamente

---

**Desenvolvido com Lovable** 🧡