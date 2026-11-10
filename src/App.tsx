
import { useEffect, useState } from 'react';

import {
  LayoutDashboard,
  Calculator,
  Package,
  Boxes,
  Factory,
  ChartNoAxesCombined,
  Settings,
  Printer,
  Plus,
  TrendingUp,
  Clock,
  Wallet,
  Menu,
  Sun,
  Moon,
} from 'lucide-react';

import './index.css';
import Cadastros from './pages/Cadastros';
import Calculadora from './pages/Calculadora';
import Estoque from './pages/Estoque';
import { db, type ProductionOrder } from './database/db';
import Configuracoes from './pages/Configuracoes';
import Produtos from './pages/Produtos';
import Producao from './pages/Producao';

const menu = [
  { name: 'Dashboard', icon: LayoutDashboard },
  { name: 'Calculadora', icon: Calculator },
  { name: 'Estoque', icon: Package },
  { name: 'Produtos', icon: Boxes },
  { name: 'Produção', icon: Factory },
  { name: 'Financeiro', icon: ChartNoAxesCombined },
  { name: 'Configurações', icon: Settings },
];

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

function App() {
  const [active, setActive] = useState('Dashboard');

  const [dashboardStats, setDashboardStats] = useState({
    products: 0,
    stockValue: 0,
    activeOrders: 0,
    estimatedProfit: 0,
  });

  const [recentOrders, setRecentOrders] = useState<ProductionOrder[]>([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('calculadora3d-theme') === 'dark';
  });

  const [dashboardSettings, setDashboardSettings] = useState({
    energyPrice: 0.78,
    defaultPlaPrice: 110,
    defaultPetgPrice: 110,
  });

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      darkMode ? 'dark' : 'light'
    );

    localStorage.setItem(
      'calculadora3d-theme',
      darkMode ? 'dark' : 'light'
    );
  }, [darkMode]);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      setLoadingDashboard(true);

      try {
        const [
          energy,
          pla,
          petg,
          products,
          filaments,
          supplies,
          productions,
        ] = await Promise.all([
          db.settings.get('energyPrice'),
          db.settings.get('defaultPlaPrice'),
          db.settings.get('defaultPetgPrice'),
          db.products.toArray(),
          db.filaments.toArray(),
          db.supplies.toArray(),
          db.productions.toArray(),
        ]);

        if (!mounted) return;

        setDashboardSettings({
          energyPrice:
            typeof energy?.value === 'number' ? energy.value : 0.78,
          defaultPlaPrice:
            typeof pla?.value === 'number' ? pla.value : 110,
          defaultPetgPrice:
            typeof petg?.value === 'number' ? petg.value : 110,
        });

        const filamentValue = filaments.reduce(
          (total, item) =>
            total + (item.remainingGrams * item.pricePerKg) / 1000,
          0
        );

        const suppliesValue = supplies.reduce(
          (total, item) => total + item.stock * item.unitPrice,
          0
        );

        const activeOrders = productions.filter(
          (order) =>
            order.status === 'Pendente' ||
            order.status === 'Em produção'
        ).length;

        const validOrders = productions.filter(
          (order) => order.status !== 'Cancelado'
        );

        const estimatedProfit = validOrders.reduce(
          (total, order) =>
            total + (order.totalPrice - order.totalCost),
          0
        );

        setDashboardStats({
          products: products.length,
          stockValue: filamentValue + suppliesValue,
          activeOrders,
          estimatedProfit,
        });

        const sortedOrders = [...productions].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
        );

        setRecentOrders(sortedOrders.slice(0, 5));
      } catch (error) {
        console.error('Erro ao carregar Dashboard:', error);
      } finally {
        if (mounted) {
          setLoadingDashboard(false);
        }
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [active]);

  const getStatusClass = (status: ProductionOrder['status']) => {
    switch (status) {
      case 'Pendente':
        return 'activity-status pending';
      case 'Em produção':
        return 'activity-status working';
      case 'Concluído':
        return 'activity-status done';
      case 'Cancelado':
        return 'activity-status cancelled';
      default:
        return 'activity-status';
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">3D</div>
          <div>
            <h2>Calculadora 3D</h2>
            <span>GESTÃO DE PERSONALIZADOS</span>
          </div>
        </div>

        <div className="menu-label">MENU PRINCIPAL</div>

        <nav>
          {menu.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                className={`nav-item ${
                  active === item.name ? 'active' : ''
                }`}
                onClick={() => setActive(item.name)}
                type="button"
              >
                <Icon size={19} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <Printer size={20} />
          <div>
            <strong>Sua produção 3D</strong>
            <span>Sistema local</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <span className="breadcrumb">Início / </span>
            <strong>{active}</strong>
          </div>

          <div className="topbar-actions">
            <button
              className="theme-toggle"
              onClick={() => setDarkMode((current) => !current)}
              title={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
              aria-label={darkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
              type="button"
            >
              {darkMode ? <Sun size={19} /> : <Moon size={19} />}
              <span>{darkMode ? 'Modo claro' : 'Modo escuro'}</span>
            </button>

            <div className="profile">
              <div className="avatar">SN</div>
              <span>Minha empresa</span>
            </div>
          </div>
        </header>

        <section className="content">
          <div className="welcome">
            <div>
              <span className="eyebrow">GESTÃO INTELIGENTE</span>

              <h1>
                {active === 'Dashboard'
                  ? 'Olá! Bem-vinda 👋'
                  : active}
              </h1>

              <p>
                {active === 'Dashboard'
                  ? 'Vamos acompanhar sua produção e seus resultados.'
                  : `Gerencie aqui as informações de ${active.toLowerCase()}.`}
              </p>
            </div>

            <button
              className="primary-button"
              onClick={() => setActive('Calculadora')}
              type="button"
            >
              <Plus size={18} />
              Nova calculadora
            </button>
          </div>

          {active === 'Dashboard' ? (
            <>
              <div className="stats">
                <div className="stat-card">
                  <div className="stat-icon green">
                    <Package />
                  </div>
                  <span>Produtos cadastrados</span>
                  <strong>
                    {loadingDashboard ? '...' : dashboardStats.products}
                  </strong>
                  <small>Seu catálogo de produtos</small>
                </div>

                <div className="stat-card">
                  <div className="stat-icon blue">
                    <Wallet />
                  </div>
                  <span>Valor em estoque</span>
                  <strong>
                    {loadingDashboard
                      ? '...'
                      : formatCurrency(dashboardStats.stockValue)}
                  </strong>
                  <small>Valor dos materiais cadastrados</small>
                </div>

                <div className="stat-card">
                  <div className="stat-icon orange">
                    <Factory />
                  </div>
                  <span>Pedidos em produção</span>
                  <strong>
                    {loadingDashboard ? '...' : dashboardStats.activeOrders}
                  </strong>
                  <small>Pedidos pendentes ou em andamento</small>
                </div>

                <div className="stat-card">
                  <div className="stat-icon purple">
                    <TrendingUp />
                  </div>
                  <span>Lucro estimado</span>
                  <strong>
                    {loadingDashboard
                      ? '...'
                      : formatCurrency(dashboardStats.estimatedProfit)}
                  </strong>
                  <small>Resultado estimado dos pedidos não cancelados</small>
                </div>
              </div>

              <div className="section-title">
                <div>
                  <h2>Acesso rápido</h2>
                  <p>Escolha o que deseja fazer.</p>
                </div>
              </div>

              <div className="quick-grid">
                {[
                  {
                    name: 'Calcular peça',
                    desc: 'Descubra o custo e preço de venda.',
                    icon: Calculator,
                  },
                  {
                    name: 'Cadastrar material',
                    desc: 'Adicione filamentos e acessórios.',
                    icon: Package,
                  },
                  {
                    name: 'Cadastrar produto',
                    desc: 'Monte seu catálogo de peças.',
                    icon: Boxes,
                  },
                  {
                    name: 'Nova produção',
                    desc: 'Registre seus pedidos e lotes.',
                    icon: Factory,
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      className="quick-card"
                      key={item.name}
                      onClick={() =>
                        setActive(
                          item.name === 'Calcular peça'
                            ? 'Calculadora'
                            : item.name === 'Cadastrar material'
                              ? 'Estoque'
                              : item.name === 'Cadastrar produto'
                                ? 'Produtos'
                                : 'Produção'
                        )
                      }
                      type="button"
                    >
                      <div className="quick-icon">
                        <Icon size={22} />
                      </div>
                      <strong>{item.name}</strong>
                      <span>{item.desc}</span>
                    </button>
                  );
                })}
              </div>

              <div className="bottom-grid">
                <div className="panel">
                  <h2>Últimas atividades</h2>

                  {loadingDashboard ? (
                    <div className="empty">
                      <Clock size={30} />
                      <strong>Carregando atividades...</strong>
                    </div>
                  ) : recentOrders.length === 0 ? (
                    <div className="empty">
                      <Clock size={30} />
                      <strong>Nenhuma atividade ainda</strong>
                      <span>
                        Seus pedidos de produção aparecerão aqui.
                      </span>
                    </div>
                  ) : (
                    <div className="dashboard-activities">
                      {recentOrders.map((order) => (
                        <div className="dashboard-activity" key={order.id}>
                          <div className="activity-icon">
                            <Factory size={18} />
                          </div>

                          <div className="activity-info">
                            <strong>{order.productName}</strong>
                            <span>
                              Pedido {order.orderNumber} · {order.quantity} unidade(s)
                            </span>
                            <small>
                              {new Date(order.createdAt).toLocaleDateString(
                                'pt-BR'
                              )}
                            </small>
                          </div>

                          <span className={getStatusClass(order.status)}>
                            {order.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="panel">
                  <h2>Configurações iniciais</h2>

                  <div className="setting-row">
                    <span>Energia elétrica</span>
                    <strong>
                      {formatCurrency(dashboardSettings.energyPrice)}/kWh
                    </strong>
                  </div>

                  <div className="setting-row">
                    <span>Filamento PLA</span>
                    <strong>
                      {formatCurrency(dashboardSettings.defaultPlaPrice)}/kg
                    </strong>
                  </div>

                  <div className="setting-row">
                    <span>Filamento PETG</span>
                    <strong>
                      {formatCurrency(dashboardSettings.defaultPetgPrice)}/kg
                    </strong>
                  </div>

                  <button
                    className="text-button"
                    onClick={() => setActive('Configurações')}
                    type="button"
                  >
                    Editar configurações →
                  </button>
                </div>
              </div>
            </>
          ) : active === 'Calculadora' ? (
            <Calculadora />
          ) : active === 'Estoque' ? (
            <Estoque />
          ) : active === 'Configurações' ? (
            <div className="settings-layout">
              <Configuracoes />
              <Cadastros initialTab="impressoras" />
            </div>
          ) : active === 'Produtos' ? (
            <Produtos />
          ) : active === 'Produção' ? (
            <Producao />
          ) : (
            <div className="panel module-placeholder">
              <div className="quick-icon">
                <Menu size={25} />
              </div>

              <h2>Módulo {active}</h2>

              <p>
                Esta seção está preparada para receber suas funcionalidades.
              </p>

              <button
                className="primary-button"
                onClick={() => setActive('Dashboard')}
                type="button"
              >
                Voltar ao Dashboard
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
