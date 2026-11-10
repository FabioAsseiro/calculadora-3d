
import { useEffect, useMemo, useState } from 'react';
import {
  Plus, Search, Factory, Clock, CheckCircle2, X,
  Package, Trash2, Eye, Play, AlertTriangle
} from 'lucide-react';
import {
  db,
  type Product,
  type ProductionOrder,
  type ProductionStatus
} from '../database/db';
import './Producao.css';

type PriceType = 'consumer' | 'store';

export default function Producao() {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [showForm, setShowForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);

  const [productId, setProductId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [priceType, setPriceType] = useState<PriceType>('consumer');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadData() {
    const [orderData, productData] = await Promise.all([
      db.productions.orderBy('createdAt').reverse().toArray(),
      db.products.toArray()
    ]);

    setOrders(orderData);
    setProducts(productData);
  }

  useEffect(() => {
    loadData();
  }, []);

  const selectedProduct = products.find(
    product => String(product.id) === productId
  );

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    return orders.filter(order => {
      const matchesSearch =
        !term ||
        order.orderNumber.toLowerCase().includes(term) ||
        order.productName.toLowerCase().includes(term) ||
        order.customerName.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === 'Todos' || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  function money(value: number) {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  function timeLabel(hours: number) {
    const minutes = Math.round(hours * 60);
    return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}min`;
  }

  function resetForm() {
    setProductId('');
    setCustomerName('');
    setQuantity('1');
    setPriceType('consumer');
    setNotes('');
    setShowForm(false);
  }

  async function createOrder() {
    if (!selectedProduct || !selectedProduct.id) {
      alert('Selecione um produto do catálogo.');
      return;
    }

    const qty = Math.floor(Number(quantity));

    if (!Number.isFinite(qty) || qty < 1) {
      alert('Informe uma quantidade válida.');
      return;
    }

    const price = priceType === 'store'
      ? selectedProduct.storePrice
      : selectedProduct.consumerPrice;

    const materials = selectedProduct.materials.map(material => {
      const gramsPerUnit =
        selectedProduct.quantity > 0
          ? material.grams / selectedProduct.quantity
          : 0;

      return {
        filamentId: material.filamentId,
        filamentName: material.filamentName,
        gramsPerUnit,
        totalGrams: gramsPerUnit * qty
      };
    });

    const order: ProductionOrder = {
      orderNumber: `PED-${Date.now().toString().slice(-8)}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      customerName: customerName.trim(),
      quantity: qty,
      printerName: selectedProduct.printerName,
      materials,
      unitCost: selectedProduct.unitCost,
      totalCost: selectedProduct.unitCost * qty,
      unitPrice: price,
      totalPrice: price * qty,
      status: 'Pendente',
      stockConsumed: false,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
      completedAt: null
    };

    setSaving(true);
    try {
      await db.productions.add(order);
      await loadData();
      resetForm();
    } catch {
      alert('Não foi possível cadastrar o pedido.');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(
    order: ProductionOrder,
    status: ProductionStatus
  ) {
    if (!order.id) return;

    if (order.stockConsumed) {
      alert('O consumo deste pedido já foi registrado. Não é possível alterar o status por aqui.');
      return;
    }

    if (status === 'Concluído') {
      alert('Para concluir, use o botão "Registrar consumo e concluir".');
      return;
    }

    if (status === 'Cancelado') {
      const confirmed = window.confirm(
        `Deseja cancelar o pedido ${order.orderNumber}?`
      );
      if (!confirmed) return;
    }

    await db.productions.update(order.id, { status });
    await loadData();

    if (selectedOrder?.id === order.id) {
      setSelectedOrder({ ...order, status });
    }
  }

  async function completeOrder(order: ProductionOrder) {
    if (!order.id) return;

    if (order.stockConsumed) {
      alert('O estoque deste pedido já foi baixado.');
      return;
    }

    if (order.status === 'Cancelado') {
      alert('Não é possível concluir um pedido cancelado.');
      return;
    }

    const confirmed = window.confirm(
      `Confirma o consumo dos materiais e a conclusão do pedido ${order.orderNumber}? Esta ação dará baixa no estoque.`
    );

    if (!confirmed) return;

    try {
      await db.transaction(
        'rw',
        db.productions,
        db.filaments,
        async () => {
          const currentOrder = await db.productions.get(order.id!);

          if (!currentOrder || currentOrder.stockConsumed) {
            throw new Error('O consumo deste pedido já foi registrado.');
          }

          if (currentOrder.status === 'Cancelado') {
            throw new Error('O pedido está cancelado.');
          }

          const consumption = new Map<number, number>();

          for (const material of currentOrder.materials) {
            if (!material.filamentId) {
              throw new Error(
                `O material "${material.filamentName}" não está vinculado a um rolo do estoque.`
              );
            }

            const current = consumption.get(material.filamentId) ?? 0;
            consumption.set(
              material.filamentId,
              current + material.totalGrams
            );
          }

          for (const [filamentId, grams] of consumption) {
            const filament = await db.filaments.get(filamentId);

            if (!filament) {
              throw new Error('Um dos filamentos do pedido não foi encontrado no estoque.');
            }

            if (filament.remainingGrams < grams) {
              throw new Error(
                `Estoque insuficiente para ${filament.brand} - ${filament.color}. Necessário: ${grams.toFixed(1)} g; disponível: ${filament.remainingGrams.toFixed(1)} g.`
              );
            }
          }

          for (const [filamentId, grams] of consumption) {
            const filament = await db.filaments.get(filamentId);

            if (!filament) {
              throw new Error('Filamento não encontrado.');
            }

            await db.filaments.update(filamentId, {
              remainingGrams: Math.max(0, filament.remainingGrams - grams)
            });
          }

          await db.productions.update(order.id!, {
            status: 'Concluído',
            stockConsumed: true,
            completedAt: new Date().toISOString()
          });
        }
      );

      await loadData();
      setSelectedOrder(null);
      alert('Produção concluída e consumo registrado no estoque!');
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Não foi possível registrar o consumo.'
      );
    }
  }

  async function deleteOrder(order: ProductionOrder) {
    if (!order.id) return;

    if (order.stockConsumed) {
      alert('Este pedido já teve consumo registrado. Não é possível excluí-lo.');
      return;
    }

    const confirmed = window.confirm(
      `Excluir o pedido ${order.orderNumber}?`
    );

    if (!confirmed) return;

    await db.productions.delete(order.id);
    if (selectedOrder?.id === order.id) setSelectedOrder(null);
    await loadData();
  }

  function statusClass(status: ProductionStatus) {
    if (status === 'Concluído') return 'done';
    if (status === 'Em produção') return 'working';
    if (status === 'Cancelado') return 'cancelled';
    return 'pending';
  }

  return (
    <div className="production-page">
      <div className="production-header">
        <div>
          <h1>Produção</h1>
          <p>Gerencie seus pedidos e acompanhe a fabricação.</p>
        </div>

        <button
          className="production-primary-button"
          onClick={() => setShowForm(true)}
          disabled={products.length === 0}
        >
          <Plus size={18} /> Novo pedido
        </button>
      </div>

      {products.length === 0 && (
        <div className="production-warning">
          <AlertTriangle size={19} />
          Cadastre e salve pelo menos um produto na Calculadora antes de criar pedidos.
        </div>
      )}

      <div className="production-stats">
        <div className="production-stat">
          <span>Total de pedidos</span>
          <strong>{orders.length}</strong>
        </div>
        <div className="production-stat">
          <span>Pendentes</span>
          <strong>{orders.filter(o => o.status === 'Pendente').length}</strong>
        </div>
        <div className="production-stat">
          <span>Em produção</span>
          <strong>{orders.filter(o => o.status === 'Em produção').length}</strong>
        </div>
        <div className="production-stat">
          <span>Concluídos</span>
          <strong>{orders.filter(o => o.status === 'Concluído').length}</strong>
        </div>
      </div>

      <div className="production-toolbar">
        <div className="production-search">
          <Search size={18} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar pedido, produto ou cliente..."
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option>Todos</option>
          <option>Pendente</option>
          <option>Em produção</option>
          <option>Concluído</option>
          <option>Cancelado</option>
        </select>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="production-empty">
          <Factory size={42} />
          <h3>Nenhum pedido encontrado</h3>
          <p>Seus pedidos de produção aparecerão aqui.</p>
        </div>
      ) : (
        <div className="production-list">
          {filteredOrders.map(order => (
            <article className="production-card" key={order.id}>
              <div className="production-card-main">
                <div className="production-card-icon">
                  <Package size={23} />
                </div>

                <div className="production-card-info">
                  <div className="production-order-title">
                    <strong>{order.productName}</strong>
                    <span className={`production-status ${statusClass(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <span className="production-order-number">
                    {order.orderNumber}
                  </span>
                  <span className="production-order-meta">
                    {order.customerName || 'Cliente não informado'} · {order.quantity} unidade(s)
                  </span>
                </div>
              </div>

              <div className="production-card-values">
                <span>Valor do pedido</span>
                <strong>{money(order.totalPrice)}</strong>
              </div>

              <div className="production-card-actions">
                <button onClick={() => setSelectedOrder(order)} title="Detalhes">
                  <Eye size={17} />
                </button>

                {order.status === 'Pendente' && (
                  <button
                    onClick={() => changeStatus(order, 'Em produção')}
                    title="Iniciar produção"
                  >
                    <Play size={17} />
                  </button>
                )}

                {order.status === 'Em produção' && !order.stockConsumed && (
                  <button
                    onClick={() => completeOrder(order)}
                    title="Registrar consumo e concluir"
                  >
                    <CheckCircle2 size={17} />
                  </button>
                )}

                {!order.stockConsumed && order.status !== 'Cancelado' && (
                  <button
                    onClick={() => deleteOrder(order)}
                    title="Excluir pedido"
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {showForm && (
        <div className="production-overlay" onClick={resetForm}>
          <div className="production-modal" onClick={e => e.stopPropagation()}>
            <div className="production-modal-header">
              <div>
                <h2>Novo pedido de produção</h2>
                <p>Selecione um produto do seu catálogo.</p>
              </div>
              <button onClick={resetForm}><X /></button>
            </div>

            <label>Produto *</label>
            <select
              value={productId}
              onChange={e => setProductId(e.target.value)}
            >
              <option value="">Selecione um produto</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>

            <label>Nome do cliente</label>
            <input
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Opcional"
            />

            <label>Quantidade *</label>
            <input
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
            />

            <label>Tipo de preço</label>
            <select
              value={priceType}
              onChange={e => setPriceType(e.target.value as PriceType)}
            >
              <option value="consumer">Consumidor final</option>
              <option value="store">Lojista</option>
            </select>

            <label>Observações</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Detalhes, cores, prazo ou informações do pedido..."
              rows={3}
            />

            {selectedProduct && (
              <div className="production-preview">
                <h3>Resumo do pedido</h3>
                <div>
                  <span>Custo estimado</span>
                  <strong>{money(selectedProduct.unitCost * Math.max(1, Number(quantity) || 1))}</strong>
                </div>
                <div>
                  <span>Valor de venda</span>
                  <strong>
                    {money(
                      (priceType === 'store'
                        ? selectedProduct.storePrice
                        : selectedProduct.consumerPrice) *
                      Math.max(1, Number(quantity) || 1)
                    )}
                  </strong>
                </div>
                <div>
                  <span>Tempo estimado de impressão</span>
                  <strong>
                    {timeLabel(
                      selectedProduct.quantity > 0
                        ? selectedProduct.printTimeHours /
                          selectedProduct.quantity *
                          Math.max(1, Number(quantity) || 1)
                        : 0
                    )}
                  </strong>
                </div>
                <p>
                  O estoque não será alterado ao cadastrar o pedido.
                </p>
              </div>
            )}

            <div className="production-modal-actions">
              <button onClick={resetForm}>Cancelar</button>
              <button
                className="production-primary-button"
                onClick={createOrder}
                disabled={saving || !selectedProduct}
              >
                {saving ? 'Salvando...' : 'Criar pedido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="production-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="production-modal" onClick={e => e.stopPropagation()}>
            <div className="production-modal-header">
              <div>
                <h2>{selectedOrder.productName}</h2>
                <p>{selectedOrder.orderNumber}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)}><X /></button>
            </div>

            <div className="production-detail-grid">
              <div><span>Status</span><strong>{selectedOrder.status}</strong></div>
              <div><span>Quantidade</span><strong>{selectedOrder.quantity}</strong></div>
              <div><span>Custo total</span><strong>{money(selectedOrder.totalCost)}</strong></div>
              <div><span>Venda total</span><strong>{money(selectedOrder.totalPrice)}</strong></div>
              <div><span>Impressora</span><strong>{selectedOrder.printerName}</strong></div>
              <div><span>Cliente</span><strong>{selectedOrder.customerName || 'Não informado'}</strong></div>
            </div>

            <div className="production-detail-section">
              <h3>Materiais previstos</h3>
              {selectedOrder.materials.map((material, index) => (
                <div className="production-material" key={index}>
                  <span>{material.filamentName}</span>
                  <strong>{material.totalGrams.toFixed(1)} g</strong>
                </div>
              ))}
            </div>

            {selectedOrder.notes && (
              <div className="production-detail-section">
                <h3>Observações</h3>
                <p>{selectedOrder.notes}</p>
              </div>
            )}

            <div className="production-detail-section">
              <p>
                <Clock size={16} /> Criado em{' '}
                {new Date(selectedOrder.createdAt).toLocaleString('pt-BR')}
              </p>
              {selectedOrder.completedAt && (
                <p>
                  <CheckCircle2 size={16} /> Concluído em{' '}
                  {new Date(selectedOrder.completedAt).toLocaleString('pt-BR')}
                </p>
              )}
              <p>
                <Package size={16} /> Consumo de estoque:{' '}
                <strong>{selectedOrder.stockConsumed ? 'Registrado' : 'Ainda não registrado'}</strong>
              </p>
            </div>

            {selectedOrder.status === 'Em produção' && !selectedOrder.stockConsumed && (
              <button
                className="production-primary-button production-complete-button"
                onClick={() => completeOrder(selectedOrder)}
              >
                <CheckCircle2 size={18} /> Registrar consumo e concluir
              </button>
            )}

            {selectedOrder.status === 'Pendente' && (
              <button
                className="production-primary-button production-complete-button"
                onClick={() => changeStatus(selectedOrder, 'Em produção')}
              >
                <Play size={18} /> Iniciar produção
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
